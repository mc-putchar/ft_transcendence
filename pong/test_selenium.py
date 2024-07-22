import time

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

chrome_options = webdriver.ChromeOptions()
chrome_options.add_argument("--incognito")
chrome_options.add_argument("--window-size=360,900")
chrome_options.add_argument("--user-agent=Mozilla/5.0 (Linux; Android 4.2.1; en-us; Nexus 5 Build/JOP40D) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.166 Mobile Safari/535.19")

driver = webdriver.Remote(
    command_executor='http://selenium:4444/wd/hub',
    options=chrome_options )

def test_login_navigation(username="foo", password="foo"):
    try:
        driver.get("http://django:8000/")
        
        WebDriverWait(driver, 10).until(EC.title_contains("Online"))
        login_link = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "a.btn-primary[data-link]"))
        )
        login_link.click()
        
        WebDriverWait(driver, 10).until(EC.url_contains("/login"))
        
        username_field = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.NAME, "username"))
        )
        password_field = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.NAME, "password"))
        )
        
        username_field.send_keys(username)
        password_field.send_keys(password)
        
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "button[type='submit']"))
        ).click()

        time.sleep(1)

        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "a[href='/chat']"))
        ).click()


        message_field = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "chat-message-input"))
        ).send_keys("Hello World")

        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "chat-message-submit"))
        ).click()

        time.sleep(1)
    except Exception as e:
        print(e)
        driver.quit()
        exit()

def duel_user():
    try:
        time.sleep(0.5)
        # get the chat input field
        message_field = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "chat-message-input"))
        ).send_keys("/duel foo")
        
        # send the message
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "chat-message-submit"))
        ).click()

        time.sleep(1)

    except Exception as e:
        print(e)
        driver.quit()
        exit()

def accept_duel():
    try:
        time.sleep(0.5)
        WebDriverWait(driver, 10).until(
            # a modal with a <a> element btn-success class
            EC.presence_of_element_located((By.CSS_SELECTOR, "a.btn-success"))
        ).click()

    except Exception as e:
        print(e)
        driver.quit()
        exit()

if __name__ == "__main__":
    test_login_navigation("foo", "foo")
    driver.switch_to.new_window('window')
    test_login_navigation("bar", "bar")

    duel_user()
    driver.switch_to.window(driver.window_handles[0])
    accept_duel()
    # hangs here for manual testing


