import pytest
import os


@pytest.fixture(scope="session", autouse=True)
def disable_amadeus_mock_for_tests():
    """Disable AMADEUS_MOCK for tests so that mocked clients are actually called."""
    os.environ["AMADEUS_MOCK"] = "false"
