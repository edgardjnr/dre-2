import asyncio
from playwright import async_api

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:5173", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # Click on 'Não tem uma conta? Cadastre-se' to go to registration page.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div[2]/div/form/div[4]/a').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Input an invalid activation code and click 'Verificar Código' to test error handling.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div[2]/div/div[2]/div/div[2]/form/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('INVALIDCODE123')
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div[2]/div/div[2]/div/div[2]/form/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Test registration with an expired activation code by inputting it and clicking 'Verificar Código'.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div[2]/div/div[2]/div/div[2]/form/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('EXPIREDCODE123')
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div[2]/div/div[2]/div/div[2]/form/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Input an already used activation code and click 'Verificar Código' to verify error handling.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div[2]/div/div[2]/div/div[2]/form/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('USEDCODE123')
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div[2]/div/div[2]/div/div[2]/form/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Assert error message is shown for invalid activation code
        error_locator = frame.locator('text=Erro ao validar código de ativação.')
        assert await error_locator.is_visible()
        # Clear input before next test
        input_locator = frame.locator('xpath=html/body/div/div/div[2]/div/div[2]/div/div[2]/form/div/div/input').nth(0)
        await input_locator.fill('')
        # Assert error message is shown for expired activation code
        await input_locator.fill('EXPIREDCODE123')
        await frame.locator('xpath=html/body/div/div/div[2]/div/div[2]/div/div[2]/form/div[2]/button').nth(0).click()
        assert await error_locator.is_visible()
        # Clear input before next test
        await input_locator.fill('')
        # Assert error message is shown for already used activation code
        await input_locator.fill('USEDCODE123')
        await frame.locator('xpath=html/body/div/div/div[2]/div/div[2]/div/div[2]/form/div[2]/button').nth(0).click()
        assert await error_locator.is_visible()
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    