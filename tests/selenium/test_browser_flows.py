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
    assert driver.find_element(By.CSS_SELECTOR, ".operator-name").text == credentials["username"], (
        "Logged-in main menu should show the registered username."
    )


def register_and_login(driver, base_url, label):
    credentials = unique_credentials(label)
    register_user(driver, base_url, credentials)
    login_user(driver, base_url, credentials)
    return credentials


def test_play_requires_login(driver, base_url):
    driver.get(f"{base_url}/play")

    wait_for_url_contains(driver, "/login")
    assert driver.find_element(By.TAG_NAME, "h1").text == "Welcome, Survivor", (
        "Unauthenticated /play access should redirect back to the login page."
    )


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

    assert "/main" in driver.current_url, "Registered user should land on the main menu after login."
    assert driver.find_element(By.CSS_SELECTOR, ".operator-name").text == credentials["username"], (
        "Main menu should display the username for the logged-in registered user."
    )
    assert driver.find_element(By.CSS_SELECTOR, ".play-btn").is_displayed(), (
        "Registered user should see the play button on the main menu."
    )


def test_guest_login_settings_modal(driver, base_url):
    driver.get(f"{base_url}/login")
    wait_for_clickable(driver, By.CSS_SELECTOR, ".guest-btn").click()
    wait_for_url_contains(driver, "/main")

    assert "GUEST MODE" in driver.page_source, "Guest login should show guest mode on the main menu."
    driver.find_element(By.ID, "open-settings-btn").click()
    WebDriverWait(driver, 15).until(EC.visibility_of_element_located((By.ID, "settings-modal")))

    driver.find_element(By.ID, "mute-audio").click()
    assert driver.find_element(By.ID, "mute-status").text == "ON", (
        "Settings modal should update the mute status when the mute checkbox is clicked."
    )


def test_registered_user_language_preference_persists(driver, base_url):
    credentials = register_and_login(driver, base_url, "languageuser")

    wait_for_clickable(driver, By.ID, "open-settings-btn").click()
    WebDriverWait(driver, 15).until(EC.visibility_of_element_located((By.ID, "settings-modal")))
    wait_for_clickable(driver, By.CSS_SELECTOR, "[data-open-language]").click()
    WebDriverWait(driver, 15).until(EC.visibility_of_element_located((By.ID, "language-modal")))
    wait_for_clickable(driver, By.CSS_SELECTOR, "[data-lang-option='ja']").click()
    WebDriverWait(driver, 15).until(
        lambda browser: browser.find_element(By.CSS_SELECTOR, "[data-lang-option='ja']").get_attribute("aria-pressed") == "true"
    )
    WebDriverWait(driver, 15).until(
        lambda browser: browser.find_element(By.CSS_SELECTOR, "[data-current-language-label]").text == "JA"
    )
    wait_for_clickable(driver, By.CSS_SELECTOR, "[data-confirm-language]")
    driver.execute_script("document.querySelector('[data-confirm-language]').click();")
    WebDriverWait(driver, 15).until(
        lambda browser: browser.execute_script("return document.documentElement.lang;") == "ja"
    )
    assert driver.find_element(By.CSS_SELECTOR, "[data-current-language-label]").text == "JA", (
        "Language selector should show the newly selected language."
    )

    wait_for_clickable(driver, By.ID, "close-settings-btn").click()
    WebDriverWait(driver, 15).until(EC.invisibility_of_element_located((By.ID, "settings-modal")))
    driver.find_element(By.CSS_SELECTOR, ".logout-form button").click()
    wait_for_url_contains(driver, "/login")
    login_user(driver, base_url, credentials)

    WebDriverWait(driver, 15).until(
        lambda browser: browser.execute_script("return document.documentElement.lang;") == "ja"
    )


def test_guest_friends_button_is_disabled(driver, base_url):
    driver.get(f"{base_url}/login")
    wait_for_clickable(driver, By.CSS_SELECTOR, ".guest-btn").click()
    wait_for_url_contains(driver, "/main")

    friends_button = wait_for_element(driver, By.CSS_SELECTOR, ".friends-btn")
    assert friends_button.get_attribute("disabled") == "true", (
        "Guest users should not be able to open the registered-user friends feature."
    )
    assert friends_button.get_attribute("title") == "Friends are only available for registered players.", (
        "Disabled friends button should explain that friends require a registered account."
    )


def test_registered_user_can_open_achievements(driver, base_url):
    register_and_login(driver, base_url, "achievementuser")

    driver.find_element(By.XPATH, "//button[normalize-space()='ACHIEVEMENTS']").click()
    wait_for_url_contains(driver, "/achievements")

    assert driver.find_element(By.ID, "kills").is_displayed(), (
        "Achievements page should show the kills progress stat."
    )
    assert driver.find_element(By.ID, "reloads").is_displayed(), (
        "Achievements page should show the reloads progress stat."
    )


def test_registered_user_can_open_friends_hub(driver, base_url):
    credentials = register_and_login(driver, base_url, "friendsuser")

    wait_for_clickable(driver, By.CSS_SELECTOR, "[data-friends-toggle]").click()
    WebDriverWait(driver, 15).until(
        EC.visibility_of_element_located((By.CSS_SELECTOR, ".friends-hub-link"))
    )
    driver.find_element(By.CSS_SELECTOR, ".friends-hub-link").click()
    wait_for_url_contains(driver, "/friends")

    assert f"{credentials['username']}'s Friends" in driver.find_element(By.TAG_NAME, "h1").text, (
        "Friends hub heading should identify the logged-in registered user."
    )
    assert driver.find_element(By.CSS_SELECTOR, "[data-friend-username]").is_displayed(), (
        "Friends hub should render the friend search username field."
    )
    assert "No friends yet" in driver.page_source, (
        "Newly registered user should start with an empty friends list."
    )


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

    assert result["ok"] is True, "Profile form POST should succeed for a logged-in registered user."
    assert "Profile updated." in result["text"], (
        "Profile update response should confirm the profile was saved."
    )


def test_registered_user_can_logout(driver, base_url):
    register_and_login(driver, base_url, "logoutuser")

    wait_for_clickable(driver, By.CSS_SELECTOR, ".logout-form button[type='submit']").click()
    wait_for_url_contains(driver, "/login")

    assert driver.find_element(By.TAG_NAME, "h1").text == "Welcome, Survivor", (
        "Logout should return the registered user to the login page."
    )
