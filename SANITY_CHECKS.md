# Sanity Checks Guide

These checks are focused on the testing work expected for the CITS3403 project:

- a good selection of Python unit tests
- a good selection of Selenium browser/system tests
- repeatable tests that use isolated test databases
- clear failures that help the next teammate debug quickly

The teacher did not require Playwright, CI workflows, Selenium IDE recordings, mocks, fakes, stubs, TDD, integration tests, or acceptance tests for this project.

## Main Command

From the project root, run:

```bash
python -m pytest
```

This uses `pytest.ini`, which collects:

- `tests/unit`
- `tests/selenium`

On this Mac, plain `python` may not exist unless the virtual environment is active. If needed, run:

```bash
.venv/bin/python -m pytest
```

To confirm what pytest will run without running the tests:

```bash
.venv/bin/python -m pytest --collect-only -q
```

The project should collect at least 5 unit tests and 5 Selenium tests. It currently targets 14 unit/test-client tests and 10 Selenium tests.

## What The Required Tests Cover

| Layer | Command | What it checks |
| --- | --- | --- |
| Unit tests | `python -m pytest tests/unit` | Validation helpers, save payload handling, encrypted chat payload validation, achievement logic, world chat routes |
| Selenium tests | `python -m pytest tests/selenium` | Real Flask pages in a real browser: login, register, guest mode, settings, achievements, friends, profile saving |

## First-Time Setup

Everyone needs:

- Python 3
- Google Chrome
- project Python packages from `requirements.txt`

### Windows PowerShell

```powershell
py -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m pytest
```

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m pytest
```

If `python` is not available on macOS but `.venv` exists:

```bash
.venv/bin/python -m pytest
```

## Useful Commands

Run the fast unit layer:

```bash
.venv/bin/python -m pytest tests/unit -q
```

Run the Selenium browser layer:

```bash
.venv/bin/python -m pytest tests/selenium -q
```

Run one Selenium test:

```bash
.venv/bin/python -m pytest tests/selenium -k guest_login -vv
```

Run the marking-focused helper:

```bash
.venv/bin/python sanity_check.py
```

List what the helper will run:

```bash
.venv/bin/python sanity_check.py --list
```

Run only the fast unit layer through the helper:

```bash
.venv/bin/python sanity_check.py --quick
```

## Optional JavaScript Sanity

JavaScript lint/static checks are useful while developing, but they are not the teacher's required testing evidence.

Install Node dependencies if you want this optional check:

```bash
npm install
```

Run:

```bash
npm run sanity:js
```

You can also include it in the helper:

```bash
.venv/bin/python sanity_check.py --include-js
```

## How The Tests Stay Isolated

- `tests/conftest.py` sets test-only environment variables.
- Unit and route tests use a temporary SQLite test database.
- `tests/selenium/conftest.py` starts `scripts/run_selenium_server.py`.
- The Selenium server runs on `http://127.0.0.1:5001`.
- Selenium uses an isolated temporary browser profile and test database.

The tests should not use or modify the normal development database.

## Reading Failures

Start with the first failure. Later failures can be caused by the first one.

Python failures usually look like:

```text
FAILED tests/unit/test_helpers.py::test_name
AssertionError: helpful message
```

Selenium failures usually show the page action or assertion that failed. The Selenium tests include assertion messages for the important user-visible behavior, such as login redirects, guest restrictions, achievements, friends, and profile saving.

Debugging flow:

1. Run the failing test with `-vv`.
2. Read the assertion message.
3. Open the file and line number shown by pytest.
4. Fix the smallest relevant app behavior or test expectation.
5. Re-run the specific failing test.
6. Re-run `.venv/bin/python -m pytest` before submitting.

## Common Problems

### `python` is not found

Activate the virtual environment:

```bash
source .venv/bin/activate
python -m pytest
```

Or run the interpreter directly:

```bash
.venv/bin/python -m pytest
```

### `No module named pytest`

Install the Python dependencies in the virtual environment:

```bash
.venv/bin/python -m pip install -r requirements.txt
```

### Selenium cannot start Chrome

Install Google Chrome, then run:

```bash
.venv/bin/python -m pytest tests/selenium -vv
```

Selenium Manager may need internet access the first time it downloads a matching browser driver.

### Selenium server does not start

Run the server directly to see the real Flask error:

```bash
.venv/bin/python -B scripts/run_selenium_server.py
```

Then re-run:

```bash
.venv/bin/python -m pytest tests/selenium -q
```
