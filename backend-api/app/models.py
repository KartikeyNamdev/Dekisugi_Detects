"""Pydantic schemas for the Fraud Worker Pool API."""

from enum import Enum
from typing import List, Optional, Union

from pydantic import BaseModel, Field, field_validator


class Verdict(str, Enum):
    HIGH_RISK = "HIGH_RISK"
    MEDIUM_RISK = "MEDIUM_RISK"
    LOW_RISK = "LOW_RISK"
    LIKELY_LEGITIMATE = "LIKELY_LEGITIMATE"
    INSUFFICIENT_INFORMATION = "INSUFFICIENT_INFORMATION"


class IndicatorType(str, Enum):
    URGENCY = "urgency"
    THREAT_INTIMIDATION = "threat_intimidation"
    OTP_REQUEST = "otp_request"
    CREDENTIAL_REQUEST = "credential_request"
    PAYMENT_REQUEST = "payment_request"
    ADVANCE_FEE = "advance_fee"
    UNOFFICIAL_LINK = "unofficial_link"
    SUSPICIOUS_DOMAIN = "suspicious_domain"
    IMPERSONATION = "impersonation"
    FAKE_AUTHORITY = "fake_authority"
    UNREALISTIC_PROFIT = "unrealistic_profit"
    JOB_FEE = "job_fee"
    LOAN_HARASSMENT = "loan_harassment"
    REMOTE_ACCESS_REQUEST = "remote_access_request"
    SUSPICIOUS_APP = "suspicious_app"
    PRESSURE_TO_INSTALL_APP = "pressure_to_install_app"


class Indicator(BaseModel):
    type: IndicatorType
    evidence: str = Field(..., description="Paraphrased or quoted evidence from the input")


class ReportingScript(BaseModel):
    note: str
    fields_to_prepare: List[str]
    partner_procedure_text: Optional[str] = Field(
        default=None,
        description="Verbatim partner-validated procedure text, only present if data/post_incident_procedure.txt has real content.",
    )


class AnalyzeResponse(BaseModel):
    verdict: Verdict
    confidence: float = Field(..., ge=0.0, le=1.0)
    scam_type: Optional[str] = None
    summary: str
    indicators: List[Indicator] = Field(default_factory=list)
    recommended_action: List[str] = Field(default_factory=list)
    rbi_regulated: Optional[Union[bool, str]] = Field(
        default=None,
        description="true, false, the string 'NOT_FOUND', or null if no app_name was supplied",
    )
    rbi_match: Optional[str] = Field(default=None, description="Matched official app name, if any")
    immediate_actions: List[str] = Field(default_factory=list)
    reporting_script: Optional[ReportingScript] = None

    @field_validator("rbi_regulated")
    @classmethod
    def validate_rbi_regulated(cls, v):
        if v is None or isinstance(v, bool):
            return v
        if isinstance(v, str) and v == "NOT_FOUND":
            return v
        raise ValueError("rbi_regulated must be true, false, 'NOT_FOUND', or null")


class ErrorResponse(BaseModel):
    error: str
    code: str


# --- Internal schema the model is asked to produce (before we enrich it) ---


class ClaudeClassification(BaseModel):
    """What we ask Claude to return. Enriched afterwards with RBI lookup +
    action guidance, which are deterministic, non-AI steps."""

    verdict: Verdict
    confidence: float = Field(..., ge=0.0, le=1.0)
    scam_type: Optional[str] = None
    summary: str
    indicators: List[Indicator] = Field(default_factory=list)
    recommended_action: List[str] = Field(default_factory=list)
