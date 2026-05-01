import time

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait


def unique_credentials(label):
    suffix = f"{int(time.time() * 1000)}"
    return {
        "username": f"{label}_{suffix}".lower(),
        "password": "SmokeTest123!",
    }


def wait_for_url_contains(driver, text):
    WebDriverWait(driver, 15).until(EC.url_contains(text))


def register_user(driver, base_url, credentials):
    driver.get(f"{base_url}/register")
    driver.find_element(By.ID, "username").send_keys(credentials["username"])
    driver.find_element(By.ID, "password").send_keys(credentials["password"])
    driver.find_element(By.ID, "confirm-password").send_keys(credentials["password"])
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
    wait_for_url_contains(driver, "/login")


def login_user(driver, base_url, credentials):
    driver.get(f"{base_url}/login")
    driver.find_element(By.ID, "username").send_keys(credentials["username"])
    driver.find_element(By.ID, "password").send_keys(credentials["password"])
    driver.find_element(By.CSS_SELECTOR, ".login-btn").click()
    wait_for_url_contains(driver, "/main")
    assert driver.find_element(By.CSS_SELECTOR, ".operator-name").text == credentials["username"]


def register_and_login(driver, base_url, label):
    credentials = unique_credentials(label)
    register_user(driver, base_url, credentials)
    login_user(driver, base_url, credentials)
    return credentials


def test_play_requires_login(driver, base_url):
    driver.get(f"{base_url}/play")

    wait_for_url_contains(driver, "/login")
    assert driver.find_element(By.TAG_NAME, "h1").text == "Welcome, Survivor"


def test_user_can_register_and_login(driver, base_url):
    credentials = register_and_login(driver, base_url, "seleniumuser")

    assert "/main" in driver.current_url
    assert driver.find_element(By.CSS_SELECTOR, ".operator-name").text == credentials["username"]
    assert driver.find_element(By.CSS_SELECTOR, ".play-btn").is_displayed()


def test_guest_login_settings_modal(driver, base_url):
    driver.get(f"{base_url}/login")
    driver.find_element(By.CSS_SELECTOR, ".guest-btn").click()
    wait_for_url_contains(driver, "/main")

    assert "GUEST MODE" in driver.page_source
    driver.find_element(By.ID, "open-settings-btn").click()
    WebDriverWait(driver, 15).until(EC.visibility_of_element_located((By.ID, "settings-modal")))

    driver.find_element(By.ID, "mute-audio").click()
    assert driver.find_element(By.ID, "mute-status").text == "ON"


def test_registered_user_can_open_achievements(driver, base_url):
    register_and_login(driver, base_url, "achievementuser")

    driver.find_element(By.XPATH, "//button[normalize-space()='ACHIEVEMENTS']").click()
    wait_for_url_contains(driver, "/achievements")

    assert driver.find_element(By.ID, "kills").is_displayed()
    assert driver.find_element(By.ID, "reloads").is_displayed()


def test_profile_background_save_success(driver, base_url):
    register_and_login(driver, base_url, "profileuser")

    driver.get(f"{base_url}/profile")
    wait_for_url_contains(driver, "/profile")

    background = WebDriverWait(driver, 15).until(
        EC.element_to_be_clickable((By.ID, "profile-background"))
    )
    Select(background).select_by_value("neon")
    result = driver.execute_async_script("""
        const done = arguments[arguments.length - 1];
        const form = document.querySelector(".profile-form");
        fetch(form.action, {
            method: "POST",
            body: new FormData(form),
            credentials: "same-origin",
        })
            .then(async (response) => done({
                ok: response.ok,
                text: await response.text(),
            }))
            .catch((error) => done({
                ok: false,
                text: String(error),
            }));
    """)

    assert result["ok"] is True
    assert "Profile updated." in result["text"]
