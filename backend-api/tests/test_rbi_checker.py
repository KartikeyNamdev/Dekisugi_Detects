from app.services import rbi_checker


def test_exact_match():
    result = rbi_checker.check_app("Example Bank Personal Loans")
    assert result.rbi_regulated is True
    assert result.matched_name == "Example Bank Personal Loans"


def test_alias_match():
    result = rbi_checker.check_app("SampleFin")
    assert result.rbi_regulated is True
    assert result.matched_name == "SampleFin Credit"


def test_case_and_whitespace_insensitive():
    result = rbi_checker.check_app("  demo nbfc loan app  ")
    assert result.rbi_regulated is True
    assert result.matched_name == "DemoNBFC Instant Loan"


def test_unknown_app_returns_not_found_not_false():
    result = rbi_checker.check_app("TotallyMadeUpLoanAppXYZ123")
    assert result.rbi_regulated == "NOT_FOUND"
    assert result.matched_name is None


def test_no_app_name_returns_none():
    result = rbi_checker.check_app(None)
    assert result.rbi_regulated is None
    assert result.matched_name is None


def test_empty_string_app_name_returns_none():
    result = rbi_checker.check_app("   ")
    assert result.rbi_regulated is None
