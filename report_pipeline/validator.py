from typing import Any, Dict, List


REQUIRED_FIELDS = [
    "A.general.customer_name",
    "A.general.customer_code",
    "A.general.address",
    "A.general.main_business",
    "A.general.owner_equity_latest",
    "A.credit.debt_group_latest",
    "A.proposal.loan_purpose",
    "A.proposal.loan_amount_agribank",
    "A.proposal.total_credit_demand",
    "B.plan.hmtd.recommended_limit",
    "A.collateral.total_collateral_value",
]


def get_flat_value(flat_data: Dict[str, Any], key: str) -> Any:
    return flat_data.get(key)


def validate_required_fields(flat_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    issues: List[Dict[str, Any]] = []
    for key in REQUIRED_FIELDS:
        value = get_flat_value(flat_data, key)
        if value is None or (isinstance(value, str) and value.strip() == ""):
            issues.append(
                {
                    "type": "ERROR",
                    "code": "REQUIRED_MISSING",
                    "field": key,
                    "message": f"Required field is missing: {key}",
                }
            )
    return issues


def validate_business_rules(flat_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    issues: List[Dict[str, Any]] = []

    total_credit_demand = flat_data.get("A.proposal.total_credit_demand")
    hmtd_limit = flat_data.get("B.plan.hmtd.recommended_limit")
    if isinstance(total_credit_demand, (int, float)) and isinstance(hmtd_limit, (int, float)):
        if hmtd_limit > total_credit_demand:
            issues.append(
                {
                    "type": "WARNING",
                    "code": "HMTD_GT_TOTAL_DEMAND",
                    "field": "B.plan.hmtd.recommended_limit",
                    "message": "HMTD recommended limit is greater than total credit demand.",
                    "context": {
                        "hmtd_limit": hmtd_limit,
                        "total_credit_demand": total_credit_demand,
                    },
                }
            )

    debt_group = str(flat_data.get("A.credit.debt_group_latest", "")).lower()
    if debt_group and "nhóm 1" not in debt_group and "nhom 1" not in debt_group:
        issues.append(
            {
                "type": "WARNING",
                "code": "DEBT_GROUP_RISK",
                "field": "A.credit.debt_group_latest",
                "message": "Debt group is not Nhom 1; require manual risk review.",
            }
        )

    collateral_total = flat_data.get("A.collateral.total_collateral_value")
    secured_obligation = flat_data.get("A.collateral.secured_obligation_total")
    if isinstance(collateral_total, (int, float)) and isinstance(secured_obligation, (int, float)):
        if collateral_total < secured_obligation:
            issues.append(
                {
                    "type": "WARNING",
                    "code": "COLLATERAL_LT_OBLIGATION",
                    "field": "A.collateral.total_collateral_value",
                    "message": "Collateral total value is lower than secured obligation.",
                    "context": {
                        "collateral_total": collateral_total,
                        "secured_obligation": secured_obligation,
                    },
                }
            )

    return issues


def validate_report(report_output: Dict[str, Any]) -> Dict[str, Any]:
    flat_data = report_output.get("report_draft_flat", {})
    required_issues = validate_required_fields(flat_data)
    rule_issues = validate_business_rules(flat_data)
    all_issues = required_issues + rule_issues

    errors = [x for x in all_issues if x["type"] == "ERROR"]
    warnings = [x for x in all_issues if x["type"] == "WARNING"]

    return {
        "is_valid": len(errors) == 0,
        "errors_count": len(errors),
        "warnings_count": len(warnings),
        "issues": all_issues,
    }

