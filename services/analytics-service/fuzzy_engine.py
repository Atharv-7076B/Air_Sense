"""
Fuzzy Logic Recommendation Engine for AQI Exposure
Uses scikit-fuzzy for fuzzy inference system
"""

import numpy as np
import skfuzzy as fuzz
from skfuzzy import control as ctrl
from pydantic import BaseModel
from typing import Optional


class FuzzyInput(BaseModel):
    """Input variables for fuzzy inference"""
    aqi: float  # 0-500
    exposure_score: float  # 0-500
    health_vulnerability: float  # 1.0-3.0
    fitness_level: float  # 0-100
    time_of_day: float  # 0-24 (hour)
    activity_type: float  # 0=sedentary, 1=light, 2=moderate, 3=vigorous
    forecast_trend: float  # -1=improving, 0=stable, 1=worsening


class FuzzyOutput(BaseModel):
    """Output from fuzzy inference"""
    outdoor_safety: float  # 0-100 (0=safe, 100=avoid)
    outdoor_safety_label: str
    mask_recommendation: float  # 0-100
    mask_label: str
    mask_type: Optional[str] = None
    purifier_urgency: float  # 0-100
    purifier_label: str
    exercise_modification: float  # 0-100 (0=normal, 100=avoid)
    exercise_label: str
    ventilation_advice: float  # 0-100 (0=open windows, 100=sealed+purifier)
    ventilation_label: str
    medical_alert: float  # 0-100
    medical_label: str
    reasoning: list[str]


def _build_fuzzy_system():
    """Build the fuzzy inference system with all rules."""

    # === INPUT VARIABLES ===

    aqi = ctrl.Antecedent(np.arange(0, 501, 1), "aqi")
    aqi["good"] = fuzz.trapmf(aqi.universe, [0, 0, 30, 60])
    aqi["moderate"] = fuzz.trapmf(aqi.universe, [40, 70, 100, 130])
    aqi["unhealthy_sensitive"] = fuzz.trapmf(aqi.universe, [100, 130, 160, 190])
    aqi["unhealthy"] = fuzz.trapmf(aqi.universe, [160, 190, 250, 300])
    aqi["hazardous"] = fuzz.trapmf(aqi.universe, [250, 300, 500, 500])

    exposure = ctrl.Antecedent(np.arange(0, 501, 1), "exposure")
    exposure["low"] = fuzz.trapmf(exposure.universe, [0, 0, 30, 60])
    exposure["medium"] = fuzz.trapmf(exposure.universe, [40, 70, 120, 160])
    exposure["high"] = fuzz.trapmf(exposure.universe, [120, 160, 250, 300])
    exposure["very_high"] = fuzz.trapmf(exposure.universe, [250, 300, 500, 500])

    vulnerability = ctrl.Antecedent(np.arange(0, 31, 1), "vulnerability")  # scaled 0-30 (actual 1.0-3.0 × 10)
    vulnerability["low"] = fuzz.trapmf(vulnerability.universe, [0, 0, 10, 14])
    vulnerability["medium"] = fuzz.trapmf(vulnerability.universe, [12, 15, 18, 22])
    vulnerability["high"] = fuzz.trapmf(vulnerability.universe, [18, 22, 30, 30])

    fitness = ctrl.Antecedent(np.arange(0, 101, 1), "fitness")
    fitness["poor"] = fuzz.trapmf(fitness.universe, [0, 0, 20, 40])
    fitness["average"] = fuzz.trapmf(fitness.universe, [30, 45, 55, 70])
    fitness["good"] = fuzz.trapmf(fitness.universe, [60, 70, 80, 90])
    fitness["excellent"] = fuzz.trapmf(fitness.universe, [80, 90, 100, 100])

    time_of_day = ctrl.Antecedent(np.arange(0, 25, 1), "time_of_day")
    time_of_day["morning"] = fuzz.trapmf(time_of_day.universe, [5, 6, 9, 11])
    time_of_day["afternoon"] = fuzz.trapmf(time_of_day.universe, [11, 12, 15, 17])
    time_of_day["evening"] = fuzz.trapmf(time_of_day.universe, [16, 18, 20, 22])
    time_of_day["night"] = fuzz.trapmf(time_of_day.universe, [21, 23, 24, 24])

    activity = ctrl.Antecedent(np.arange(0, 4, 0.1), "activity")
    activity["sedentary"] = fuzz.trapmf(activity.universe, [0, 0, 0.3, 0.8])
    activity["light"] = fuzz.trapmf(activity.universe, [0.5, 0.8, 1.3, 1.8])
    activity["moderate"] = fuzz.trapmf(activity.universe, [1.5, 1.8, 2.3, 2.8])
    activity["vigorous"] = fuzz.trapmf(activity.universe, [2.5, 2.8, 3.9, 3.9])

    forecast = ctrl.Antecedent(np.arange(-10, 11, 1), "forecast")
    forecast["improving"] = fuzz.trapmf(forecast.universe, [-10, -10, -5, -1])
    forecast["stable"] = fuzz.trapmf(forecast.universe, [-3, -1, 1, 3])
    forecast["worsening"] = fuzz.trapmf(forecast.universe, [1, 5, 10, 10])

    # === OUTPUT VARIABLES ===

    outdoor_safety = ctrl.Consequent(np.arange(0, 101, 1), "outdoor_safety")
    outdoor_safety["safe"] = fuzz.trapmf(outdoor_safety.universe, [0, 0, 15, 30])
    outdoor_safety["caution"] = fuzz.trapmf(outdoor_safety.universe, [25, 40, 55, 70])
    outdoor_safety["avoid"] = fuzz.trapmf(outdoor_safety.universe, [60, 75, 100, 100])

    mask_rec = ctrl.Consequent(np.arange(0, 101, 1), "mask_rec")
    mask_rec["none"] = fuzz.trapmf(mask_rec.universe, [0, 0, 10, 25])
    mask_rec["optional"] = fuzz.trapmf(mask_rec.universe, [20, 30, 40, 55])
    mask_rec["recommended"] = fuzz.trapmf(mask_rec.universe, [45, 55, 70, 80])
    mask_rec["required"] = fuzz.trapmf(mask_rec.universe, [70, 80, 100, 100])

    purifier = ctrl.Consequent(np.arange(0, 101, 1), "purifier")
    purifier["not_needed"] = fuzz.trapmf(purifier.universe, [0, 0, 15, 30])
    purifier["recommended"] = fuzz.trapmf(purifier.universe, [25, 40, 60, 75])
    purifier["essential"] = fuzz.trapmf(purifier.universe, [65, 80, 100, 100])

    exercise_mod = ctrl.Consequent(np.arange(0, 101, 1), "exercise_mod")
    exercise_mod["normal"] = fuzz.trapmf(exercise_mod.universe, [0, 0, 15, 30])
    exercise_mod["reduce"] = fuzz.trapmf(exercise_mod.universe, [25, 40, 55, 70])
    exercise_mod["indoor_only"] = fuzz.trapmf(exercise_mod.universe, [60, 70, 80, 90])
    exercise_mod["avoid"] = fuzz.trapmf(exercise_mod.universe, [80, 90, 100, 100])

    ventilation = ctrl.Consequent(np.arange(0, 101, 1), "ventilation")
    ventilation["open_windows"] = fuzz.trapmf(ventilation.universe, [0, 0, 15, 30])
    ventilation["keep_closed"] = fuzz.trapmf(ventilation.universe, [25, 40, 60, 75])
    ventilation["use_purifier"] = fuzz.trapmf(ventilation.universe, [65, 80, 100, 100])

    medical_alert = ctrl.Consequent(np.arange(0, 101, 1), "medical_alert")
    medical_alert["none"] = fuzz.trapmf(medical_alert.universe, [0, 0, 10, 25])
    medical_alert["monitor"] = fuzz.trapmf(medical_alert.universe, [20, 30, 45, 60])
    medical_alert["consult"] = fuzz.trapmf(medical_alert.universe, [50, 60, 75, 85])
    medical_alert["emergency"] = fuzz.trapmf(medical_alert.universe, [75, 85, 100, 100])

    # === FUZZY RULES (45 rules) ===
    rules = []

    # AQI Good scenarios
    rules.append(ctrl.Rule(aqi["good"] & vulnerability["low"], outdoor_safety["safe"]))
    rules.append(ctrl.Rule(aqi["good"] & vulnerability["low"], mask_rec["none"]))
    rules.append(ctrl.Rule(aqi["good"] & vulnerability["low"], purifier["not_needed"]))
    rules.append(ctrl.Rule(aqi["good"] & vulnerability["low"], exercise_mod["normal"]))
    rules.append(ctrl.Rule(aqi["good"], ventilation["open_windows"]))
    rules.append(ctrl.Rule(aqi["good"], medical_alert["none"]))

    # AQI Good but vulnerable
    rules.append(ctrl.Rule(aqi["good"] & vulnerability["high"], outdoor_safety["caution"]))
    rules.append(ctrl.Rule(aqi["good"] & vulnerability["high"], mask_rec["optional"]))

    # AQI Moderate scenarios
    rules.append(ctrl.Rule(aqi["moderate"] & vulnerability["low"], outdoor_safety["safe"]))
    rules.append(ctrl.Rule(aqi["moderate"] & vulnerability["low"], mask_rec["optional"]))
    rules.append(ctrl.Rule(aqi["moderate"] & vulnerability["medium"], outdoor_safety["caution"]))
    rules.append(ctrl.Rule(aqi["moderate"] & vulnerability["medium"], mask_rec["recommended"]))
    rules.append(ctrl.Rule(aqi["moderate"] & vulnerability["high"], outdoor_safety["caution"]))
    rules.append(ctrl.Rule(aqi["moderate"] & vulnerability["high"], mask_rec["required"]))
    rules.append(ctrl.Rule(aqi["moderate"], purifier["recommended"]))
    rules.append(ctrl.Rule(aqi["moderate"] & activity["vigorous"], exercise_mod["reduce"]))
    rules.append(ctrl.Rule(aqi["moderate"] & activity["sedentary"], exercise_mod["normal"]))
    rules.append(ctrl.Rule(aqi["moderate"], ventilation["keep_closed"]))
    rules.append(ctrl.Rule(aqi["moderate"] & vulnerability["high"], medical_alert["monitor"]))

    # AQI Unhealthy for Sensitive
    rules.append(ctrl.Rule(aqi["unhealthy_sensitive"] & vulnerability["low"], outdoor_safety["caution"]))
    rules.append(ctrl.Rule(aqi["unhealthy_sensitive"] & vulnerability["low"], mask_rec["recommended"]))
    rules.append(ctrl.Rule(aqi["unhealthy_sensitive"] & vulnerability["high"], outdoor_safety["avoid"]))
    rules.append(ctrl.Rule(aqi["unhealthy_sensitive"] & vulnerability["high"], mask_rec["required"]))
    rules.append(ctrl.Rule(aqi["unhealthy_sensitive"], purifier["recommended"]))
    rules.append(ctrl.Rule(aqi["unhealthy_sensitive"] & activity["vigorous"], exercise_mod["indoor_only"]))
    rules.append(ctrl.Rule(aqi["unhealthy_sensitive"] & activity["moderate"], exercise_mod["reduce"]))
    rules.append(ctrl.Rule(aqi["unhealthy_sensitive"], ventilation["use_purifier"]))
    rules.append(ctrl.Rule(aqi["unhealthy_sensitive"] & vulnerability["high"], medical_alert["consult"]))
    rules.append(ctrl.Rule(aqi["unhealthy_sensitive"] & vulnerability["low"], medical_alert["monitor"]))

    # AQI Unhealthy scenarios
    rules.append(ctrl.Rule(aqi["unhealthy"], outdoor_safety["avoid"]))
    rules.append(ctrl.Rule(aqi["unhealthy"] & vulnerability["low"], mask_rec["required"]))
    rules.append(ctrl.Rule(aqi["unhealthy"], purifier["essential"]))
    rules.append(ctrl.Rule(aqi["unhealthy"] & activity["vigorous"], exercise_mod["avoid"]))
    rules.append(ctrl.Rule(aqi["unhealthy"] & activity["moderate"], exercise_mod["indoor_only"]))
    rules.append(ctrl.Rule(aqi["unhealthy"] & activity["light"], exercise_mod["reduce"]))
    rules.append(ctrl.Rule(aqi["unhealthy"], ventilation["use_purifier"]))
    rules.append(ctrl.Rule(aqi["unhealthy"] & vulnerability["high"], medical_alert["emergency"]))
    rules.append(ctrl.Rule(aqi["unhealthy"] & vulnerability["medium"], medical_alert["consult"]))
    rules.append(ctrl.Rule(aqi["unhealthy"] & vulnerability["low"], medical_alert["monitor"]))

    # AQI Hazardous scenarios
    rules.append(ctrl.Rule(aqi["hazardous"], outdoor_safety["avoid"]))
    rules.append(ctrl.Rule(aqi["hazardous"], mask_rec["required"]))
    rules.append(ctrl.Rule(aqi["hazardous"], purifier["essential"]))
    rules.append(ctrl.Rule(aqi["hazardous"], exercise_mod["avoid"]))
    rules.append(ctrl.Rule(aqi["hazardous"], ventilation["use_purifier"]))
    rules.append(ctrl.Rule(aqi["hazardous"] & vulnerability["high"], medical_alert["emergency"]))
    rules.append(ctrl.Rule(aqi["hazardous"] & vulnerability["low"], medical_alert["consult"]))

    # Forecast worsening rules
    rules.append(ctrl.Rule(forecast["worsening"] & aqi["moderate"], purifier["recommended"]))

    # Fitness-based exercise modification
    rules.append(ctrl.Rule(fitness["excellent"] & aqi["moderate"], exercise_mod["normal"]))
    rules.append(ctrl.Rule(fitness["poor"] & aqi["moderate"], exercise_mod["reduce"]))

    # Exposure-based rules
    rules.append(ctrl.Rule(exposure["very_high"], outdoor_safety["avoid"]))
    rules.append(ctrl.Rule(exposure["very_high"], mask_rec["required"]))
    rules.append(ctrl.Rule(exposure["high"] & vulnerability["high"], medical_alert["consult"]))
    rules.append(ctrl.Rule(exposure["high"], exercise_mod["reduce"]))
    rules.append(ctrl.Rule(exposure["low"], exercise_mod["normal"]))

    # Time-of-day rules (peak pollution hours)
    rules.append(ctrl.Rule(time_of_day["morning"] & aqi["moderate"], exercise_mod["normal"]))
    rules.append(ctrl.Rule(time_of_day["afternoon"] & aqi["unhealthy_sensitive"], outdoor_safety["avoid"]))
    rules.append(ctrl.Rule(time_of_day["evening"] & aqi["moderate"], ventilation["keep_closed"]))
    rules.append(ctrl.Rule(time_of_day["night"], ventilation["keep_closed"]))

    # Build control system
    system = ctrl.ControlSystem(rules)
    return system


# Build system once at module level
_fuzzy_system = _build_fuzzy_system()


def get_label(value: float, thresholds: list[tuple[float, str]]) -> str:
    """Get label based on value thresholds."""
    for threshold, label in thresholds:
        if value <= threshold:
            return label
    return thresholds[-1][1]


def get_mask_type(mask_value: float) -> Optional[str]:
    """Determine mask type based on recommendation level."""
    if mask_value < 25:
        return None
    elif mask_value < 55:
        return "Surgical mask"
    elif mask_value < 80:
        return "KN95 mask"
    else:
        return "N95 mask"


def run_fuzzy_inference(inputs: FuzzyInput) -> FuzzyOutput:
    """Run fuzzy inference and return recommendations."""

    sim = ctrl.ControlSystemSimulation(_fuzzy_system)

    # Scale vulnerability from 1.0-3.0 to 0-30
    vuln_scaled = (inputs.health_vulnerability - 1.0) * 15

    # Clamp inputs to valid ranges
    sim.input["aqi"] = max(0, min(500, inputs.aqi))
    sim.input["exposure"] = max(0, min(500, inputs.exposure_score))
    sim.input["vulnerability"] = max(0, min(30, vuln_scaled))
    sim.input["fitness"] = max(0, min(100, inputs.fitness_level))
    sim.input["time_of_day"] = max(0, min(24, inputs.time_of_day))
    sim.input["activity"] = max(0, min(3.9, inputs.activity_type))
    sim.input["forecast"] = max(-10, min(10, inputs.forecast_trend))

    try:
        sim.compute()
    except Exception as e:
        # Fallback: return rule-based defaults if fuzzy inference fails
        return _fallback_output(inputs, str(e))

    # Extract outputs
    outdoor_val = sim.output.get("outdoor_safety", 50)
    mask_val = sim.output.get("mask_rec", 50)
    purifier_val = sim.output.get("purifier", 50)
    exercise_val = sim.output.get("exercise_mod", 50)
    ventilation_val = sim.output.get("ventilation", 50)
    medical_val = sim.output.get("medical_alert", 25)

    # Generate reasoning
    reasoning = _generate_reasoning(inputs, outdoor_val, mask_val, medical_val)

    return FuzzyOutput(
        outdoor_safety=round(outdoor_val, 1),
        outdoor_safety_label=get_label(outdoor_val, [(30, "Safe"), (65, "Caution"), (100, "Avoid")]),
        mask_recommendation=round(mask_val, 1),
        mask_label=get_label(mask_val, [(25, "None needed"), (55, "Optional"), (80, "Recommended"), (100, "Required")]),
        mask_type=get_mask_type(mask_val),
        purifier_urgency=round(purifier_val, 1),
        purifier_label=get_label(purifier_val, [(30, "Not needed"), (70, "Recommended"), (100, "Essential")]),
        exercise_modification=round(exercise_val, 1),
        exercise_label=get_label(exercise_val, [(25, "Normal activity"), (55, "Reduce intensity"), (85, "Indoor only"), (100, "Avoid exercise")]),
        ventilation_advice=round(ventilation_val, 1),
        ventilation_label=get_label(ventilation_val, [(30, "Open windows"), (70, "Keep windows closed"), (100, "Use air purifier")]),
        medical_alert=round(medical_val, 1),
        medical_label=get_label(medical_val, [(25, "No alert"), (55, "Monitor symptoms"), (80, "Consult doctor"), (100, "Seek emergency care")]),
        reasoning=reasoning,
    )


def _generate_reasoning(inputs: FuzzyInput, outdoor: float, mask: float, medical: float) -> list[str]:
    """Generate human-readable reasoning for the recommendations."""
    reasons = []

    # AQI-based reasoning
    if inputs.aqi > 300:
        reasons.append(f"AQI of {inputs.aqi:.0f} is in the hazardous range. Minimize all outdoor exposure.")
    elif inputs.aqi > 200:
        reasons.append(f"AQI of {inputs.aqi:.0f} is very unhealthy. Outdoor activities should be avoided.")
    elif inputs.aqi > 150:
        reasons.append(f"AQI of {inputs.aqi:.0f} is unhealthy for sensitive groups.")
    elif inputs.aqi > 100:
        reasons.append(f"AQI of {inputs.aqi:.0f} is moderate. Some caution advised.")
    else:
        reasons.append(f"AQI of {inputs.aqi:.0f} is in the good range.")

    # Health vulnerability
    if inputs.health_vulnerability > 1.8:
        reasons.append("Your health conditions significantly increase pollution sensitivity. Extra precautions are critical.")
    elif inputs.health_vulnerability > 1.3:
        reasons.append("Your health profile indicates moderate sensitivity to air pollution.")

    # Fitness interaction
    if inputs.fitness_level > 75 and inputs.aqi < 150:
        reasons.append("Your good fitness level provides some resilience against moderate pollution.")
    elif inputs.fitness_level < 40 and inputs.aqi > 100:
        reasons.append("Lower fitness levels combined with poor air quality increase health risk.")

    # Forecast
    if inputs.forecast_trend > 3:
        reasons.append("Air quality is forecast to worsen. Consider preparing masks and purifiers.")
    elif inputs.forecast_trend < -3:
        reasons.append("Air quality is expected to improve in coming days.")

    # Activity level warning
    if inputs.activity_type >= 2.5 and inputs.aqi > 100:
        reasons.append("Vigorous activity greatly increases pollutant inhalation. Consider indoor alternatives.")

    return reasons


def _fallback_output(inputs: FuzzyInput, error: str) -> FuzzyOutput:
    """Simple rule-based fallback if fuzzy inference fails."""
    aqi = inputs.aqi
    vuln = inputs.health_vulnerability

    if aqi > 200:
        outdoor, mask, purifier, exercise, vent, medical = 90, 90, 90, 90, 90, 70
    elif aqi > 150:
        outdoor, mask, purifier, exercise, vent, medical = 70, 70, 70, 70, 75, 50
    elif aqi > 100:
        outdoor, mask, purifier, exercise, vent, medical = 50, 50, 50, 40, 60, 30
    elif aqi > 50:
        outdoor, mask, purifier, exercise, vent, medical = 25, 25, 30, 15, 30, 10
    else:
        outdoor, mask, purifier, exercise, vent, medical = 10, 10, 10, 5, 10, 5

    # Adjust for vulnerability
    vuln_factor = min(1.5, vuln)
    outdoor = min(100, outdoor * vuln_factor)
    medical = min(100, medical * vuln_factor)

    return FuzzyOutput(
        outdoor_safety=round(outdoor, 1),
        outdoor_safety_label=get_label(outdoor, [(30, "Safe"), (65, "Caution"), (100, "Avoid")]),
        mask_recommendation=round(mask, 1),
        mask_label=get_label(mask, [(25, "None needed"), (55, "Optional"), (80, "Recommended"), (100, "Required")]),
        mask_type=get_mask_type(mask),
        purifier_urgency=round(purifier, 1),
        purifier_label=get_label(purifier, [(30, "Not needed"), (70, "Recommended"), (100, "Essential")]),
        exercise_modification=round(exercise, 1),
        exercise_label=get_label(exercise, [(25, "Normal activity"), (55, "Reduce intensity"), (85, "Indoor only"), (100, "Avoid exercise")]),
        ventilation_advice=round(vent, 1),
        ventilation_label=get_label(vent, [(30, "Open windows"), (70, "Keep windows closed"), (100, "Use air purifier")]),
        medical_alert=round(medical, 1),
        medical_label=get_label(medical, [(25, "No alert"), (55, "Monitor symptoms"), (80, "Consult doctor"), (100, "Seek emergency care")]),
        reasoning=[f"Using simplified rule-based fallback (fuzzy engine error: {error})"],
    )
