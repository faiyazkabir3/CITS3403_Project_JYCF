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


def wait_for_page_text(driver, text):
    WebDriverWait(driver, 15).until(lambda browser: text in browser.page_source)


def wait_for_element(driver, by, value):
    return WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((by, value))
    )


def wait_for_clickable(driver, by, value):
    return WebDriverWait(driver, 15).until(
        EC.element_to_be_clickable((by, value))
    )


def register_user(driver, base_url, credentials):
    driver.get(f"{base_url}/register")
    wait_for_element(driver, By.ID, "username").send_keys(credentials["username"])
    driver.find_element(By.ID, "password").send_keys(credentials["password"])
    driver.find_element(By.ID, "confirm-password").send_keys(credentials["password"])
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
    wait_for_url_contains(driver, "/login")


def login_user(driver, base_url, credentials):
    driver.get(f"{base_url}/login")
    wait_for_element(driver, By.ID, "username").send_keys(credentials["username"])
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


def test_login_rejects_unknown_user(driver, base_url):
    credentials = unique_credentials("missinguser")

    driver.get(f"{base_url}/login")
    wait_for_element(driver, By.ID, "username").send_keys(credentials["username"])
    driver.find_element(By.ID, "password").send_keys(credentials["password"])
    driver.find_element(By.CSS_SELECTOR, ".login-btn").click()

    wait_for_page_text(driver, "Invalid username or password.")


def test_register_requires_matching_password_confirmation(driver, base_url):
    credentials = unique_credentials("mismatchuser")

    driver.get(f"{base_url}/register")
    wait_for_element(driver, By.ID, "username").send_keys(credentials["username"])
    driver.find_element(By.ID, "password").send_keys(credentials["password"])
    driver.find_element(By.ID, "confirm-password").send_keys("Different123!")
    driver.execute_script(
        "document.getElementById('register-form').submit();"
    )

    wait_for_page_text(driver, "Passwords do not match.")


def test_user_can_register_and_login(driver, base_url):
    credentials = register_and_login(driver, base_url, "seleniumuser")

    assert "/main" in driver.current_url
    assert driver.find_element(By.CSS_SELECTOR, ".operator-name").text == credentials["username"]
    assert driver.find_element(By.CSS_SELECTOR, ".play-btn").is_displayed()


def test_guest_login_settings_modal(driver, base_url):
    driver.get(f"{base_url}/login")
    wait_for_clickable(driver, By.CSS_SELECTOR, ".guest-btn").click()
    wait_for_url_contains(driver, "/main")

    assert "GUEST MODE" in driver.page_source
    driver.find_element(By.ID, "open-settings-btn").click()
    WebDriverWait(driver, 15).until(EC.visibility_of_element_located((By.ID, "settings-modal")))

    driver.find_element(By.ID, "mute-audio").click()
    assert driver.find_element(By.ID, "mute-status").text == "ON"


def test_guest_friends_button_is_disabled(driver, base_url):
    driver.get(f"{base_url}/login")
    wait_for_clickable(driver, By.CSS_SELECTOR, ".guest-btn").click()
    wait_for_url_contains(driver, "/main")

    friends_button = wait_for_element(driver, By.CSS_SELECTOR, ".friends-btn")
    assert friends_button.get_attribute("disabled") == "true"
    assert friends_button.get_attribute("title") == "Friends are only available for registered players."


def test_registered_user_can_open_achievements(driver, base_url):
    register_and_login(driver, base_url, "achievementuser")

    driver.find_element(By.XPATH, "//button[normalize-space()='ACHIEVEMENTS']").click()
    wait_for_url_contains(driver, "/achievements")

    assert driver.find_element(By.ID, "kills").is_displayed()
    assert driver.find_element(By.ID, "reloads").is_displayed()


def test_registered_user_can_open_friends_hub(driver, base_url):
    credentials = register_and_login(driver, base_url, "friendsuser")

    wait_for_clickable(driver, By.CSS_SELECTOR, "[data-friends-toggle]").click()
    WebDriverWait(driver, 15).until(
        EC.visibility_of_element_located((By.CSS_SELECTOR, ".friends-hub-link"))
    )
    driver.find_element(By.CSS_SELECTOR, ".friends-hub-link").click()
    wait_for_url_contains(driver, "/friends")

    assert f"{credentials['username']}'s Friends" in driver.find_element(By.TAG_NAME, "h1").text
    assert driver.find_element(By.CSS_SELECTOR, "[data-friend-username]").is_displayed()
    assert "No friends yet" in driver.page_source


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


def test_registered_user_can_logout(driver, base_url):
    register_and_login(driver, base_url, "logoutuser")

    wait_for_clickable(driver, By.CSS_SELECTOR, ".logout-form button[type='submit']").click()
    wait_for_url_contains(driver, "/login")

    assert driver.find_element(By.TAG_NAME, "h1").text == "Welcome, Survivor"
