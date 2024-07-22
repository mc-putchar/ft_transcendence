import time

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

chrome_options = webdriver.ChromeOptions()
chrome_options.add_argument("--incognito")

driver = webdriver.Remote(
    command_executor='http://selenium:4444/wd/hub',
    options=chrome_options )


def test_login_navigation(username="foo", password="bar"):
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

        time.sleep(2)

        # input id chat-message-input 
        message_field = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "chat-message-input"))
        ).send_keys("Hello World")

        
        # button chat-message-submit
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "chat-message-submit"))
        ).click()

        time.sleep(2)

    except Exception as e:
        print(e)
        driver.quit()
        exit()

if __name__ == "__main__":
    test_login_navigation("foo", "foo")
    driver.switch_to.new_window('window')
    test_login_navigation("bar", "bar")
    driver.quit()

