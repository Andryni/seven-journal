from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        # Launch chromium in headless mode
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Listen for console errors
        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: console_logs.append(f"[ERROR] {err.message}"))

        # Navigate
        print("Navigating to http://localhost:5173/app/playbook...")
        page.goto("http://localhost:5173/app/playbook")
        
        # Wait for page to fully load and settle
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(3000)

        # Capture a screenshot to see what's rendered
        screenshot_path = "c:\\Users\\ANDRY\\Documents\\Antigravity\\Projet2\\scratch\\playbook_inspect.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot captured at: {screenshot_path}")

        # Print all gathered console logs
        print("\n--- BROWSER CONSOLE LOGS ---")
        for log in console_logs:
            print(log)
        print("----------------------------\n")

        browser.close()

if __name__ == "__main__":
    run()
