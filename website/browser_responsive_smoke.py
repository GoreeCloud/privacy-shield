#!/usr/bin/env python3
"""Exercise the built Privacy Center at screenshot-relevant viewport widths."""
from __future__ import annotations
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
from typing import Any
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
SITE = ROOT / "dist"
WEB_PORT = 8765
DRIVER_PORT = 9518
BASE = f"http://127.0.0.1:{DRIVER_PORT}"
TARGET = f"http://127.0.0.1:{WEB_PORT}/"
VIEWPORTS = ((1180, 900), (768, 900), (390, 844), (320, 844))


class BrowserError(RuntimeError):
    pass


def require(ok: bool, msg: str) -> None:
    if not ok:
        raise BrowserError(msg)


def request(method: str, path: str, payload: dict[str, Any] | None = None) -> Any:
    data = None if payload is None else json.dumps(payload).encode()
    with urlopen(
        Request(BASE + path, data=data, method=method, headers={"Content-Type": "application/json"}),
        timeout=25,
    ) as response:
        raw = response.read()
    if not raw:
        return None
    value = json.loads(raw.decode()).get("value")
    if isinstance(value, dict) and value.get("error"):
        raise BrowserError(f"{value.get('error')}: {value.get('message', '')}")
    return value


def wait(url: str, driver: bool = False) -> None:
    end = time.monotonic() + 15
    last = None
    while time.monotonic() < end:
        try:
            if driver:
                state = request("GET", "/status")
                if isinstance(state, dict) and state.get("ready"):
                    return
            else:
                with urlopen(url, timeout=1) as response:
                    if response.status == 200:
                        return
        except Exception as exc:
            last = exc
        time.sleep(0.15)
    raise BrowserError(f"service not ready: {last}")


def driver_bin() -> str:
    for candidate in (shutil.which("chromedriver"), "/usr/local/share/chromedriver-linux64/chromedriver"):
        if candidate and Path(candidate).is_file():
            return str(candidate)
    raise BrowserError("chromedriver unavailable")


def execute(session: str, script: str) -> Any:
    return request(
        "POST",
        f"/session/{session}/execute/sync",
        {"script": script, "args": []},
    )


def main() -> int:
    server = driver = None
    session = None
    log_path = None
    try:
        require((SITE / "index.html").is_file(), "built Privacy Center missing; run website/validate.py first")
        server = subprocess.Popen(
            ["python3", "-m", "http.server", str(WEB_PORT), "--bind", "127.0.0.1", "--directory", str(SITE)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        wait(TARGET)
        with tempfile.NamedTemporaryFile(prefix="privacy-chromedriver-", suffix=".log", delete=False) as log:
            log_path = log.name
            driver = subprocess.Popen(
                [driver_bin(), f"--port={DRIVER_PORT}", "--allowed-ips=127.0.0.1"],
                stdout=log,
                stderr=subprocess.STDOUT,
            )
        wait(BASE + "/status", True)
        value = request(
            "POST",
            "/session",
            {
                "capabilities": {
                    "alwaysMatch": {
                        "browserName": "chrome",
                        "goog:chromeOptions": {
                            "args": [
                                "--headless=new",
                                "--no-sandbox",
                                "--disable-dev-shm-usage",
                                "--disable-background-networking",
                                "--disable-extensions",
                                "--no-first-run",
                                "--window-size=1180,900",
                            ]
                        },
                    }
                }
            },
        )
        require(isinstance(value, dict) and isinstance(value.get("sessionId"), str), f"bad Chrome session: {value!r}")
        session = value["sessionId"]
        request("POST", f"/session/{session}/timeouts", {"implicit": 0, "pageLoad": 15000, "script": 10000})
        request("POST", f"/session/{session}/url", {"url": TARGET})

        for requested, height in VIEWPORTS:
            request("POST", f"/session/{session}/window/rect", {"width": requested, "height": height, "x": 0, "y": 0})
            execute(session, "window.scrollTo(0,0); return true;")
            state = execute(
                session,
                """
                const h=document.querySelector('header'),m=document.querySelector('main'),n=document.querySelector('header nav');
                const theme=document.querySelector('[data-theme-toggle]');
                const brandIcon=document.querySelector('.brand img');
                const active=document.querySelector('header nav a[aria-current]');
                const hr=h?.getBoundingClientRect(),mr=m?.getBoundingClientRect(),nr=n?.getBoundingClientRect();
                const ns=n?getComputedStyle(n):null;
                const ts=theme?getComputedStyle(theme):null;
                const ar=active?.getBoundingClientRect();
                const after=active?getComputedStyle(active,'::after'):null;
                const links=[...document.querySelectorAll('header nav a')]
                  .map(x=>x.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0);
                const navRows=[...new Set(links.map(r=>Math.round(r.top)))].length;
                return {
                  ready:document.readyState,w:innerWidth,sw:document.documentElement.scrollWidth,
                  pos:h?getComputedStyle(h).position:'',headerH:hr?.height||0,hb:hr?.bottom||0,mt:mr?.top||0,
                  minNavH:links.length?Math.min(...links.map(r=>r.height)):0,
                  minNavW:links.length?Math.min(...links.map(r=>r.width)):0,
                  navRows,navH:nr?.height||0,navW:nr?.width||0,
                  navBorder:ns?.borderTopWidth||'',navBg:ns?.backgroundColor||'',
                  themeFont:ts?.fontSize||'',themeBg:ts?.backgroundColor||'',
                  brandIconW:brandIcon?.getBoundingClientRect().width||0,
                  activeHref:active?.getAttribute('href')||'',activeAfterW:after?.width||'0px',activeAfterContent:after?.content||'none',
                  activeH:ar?.height||0,docH:document.documentElement.scrollHeight
                };
                """,
            )
            require(isinstance(state, dict), f"layout unreadable at {requested}px")
            w = int(state.get("w", requested))
            require(state.get("ready") == "complete", f"page incomplete at {w}px: {state}")
            require(int(state.get("sw", w + 2)) <= w + 1, f"horizontal overflow at {w}px: {state}")
            require(state.get("pos") not in {"sticky", "fixed"}, f"header overlays content at {w}px: {state}")
            require(float(state.get("mt", 0)) + 1 >= float(state.get("hb", 0)), f"main overlaps header at {w}px: {state}")
            require(float(state.get("minNavH", 0)) >= 47.5, f"navigation target height below 48px at {w}px: {state}")
            require(float(state.get("minNavW", 0)) >= 47.5, f"navigation target width below 48px at {w}px: {state}")
            require(int(state.get("navRows", 2)) == 1, f"navigation wrapped into multiple rows at {w}px: {state}")
            require(float(state.get("navH", 0)) <= 66, f"navigation is taller than one control row at {w}px: {state}")
            require(state.get("activeHref") == "#role", f"Role is not the initial current section at {w}px: {state}")

            if w <= 980:
                border = str(state.get("navBorder", "0")).removesuffix("px") or "0"
                theme_font = str(state.get("themeFont", "0")).removesuffix("px") or "0"
                active_after = str(state.get("activeAfterW", "0")).removesuffix("px") or "0"
                require(float(border) < 0.5, f"mobile/tablet navigation regained an outer border at {w}px: {state}")
                require(
                    state.get("navBg") in {"rgba(0, 0, 0, 0)", "transparent"},
                    f"mobile/tablet navigation regained a full-row background at {w}px: {state}",
                )
                require(float(state.get("headerH", 200)) <= 104, f"mobile/tablet header is visually too tall at {w}px: {state}")
                require(float(state.get("brandIconW", 100)) <= 30.5, f"mobile/tablet brand icon is visually oversized at {w}px: {state}")
                require(float(theme_font) <= 13.0, f"appearance control competes with brand hierarchy at {w}px: {state}")
                require(
                    state.get("themeBg") in {"rgba(0, 0, 0, 0)", "transparent"},
                    f"appearance control regained a filled resting treatment at {w}px: {state}",
                )
                require(float(active_after) >= 20, f"active navigation underline is missing at {w}px: {state}")
                require(state.get("activeAfterContent") not in {"none", "normal"}, f"active navigation marker is missing at {w}px: {state}")
                compact_cap = 320 if w <= 420 else 380
                compact_limit = min(w - 32, compact_cap)
                require(float(state.get("navW", w)) <= compact_limit + 1, f"navigation cluster is visually oversized at {w}px: {state}")

            scrolled = execute(
                session,
                """
                const max=Math.max(0,document.documentElement.scrollHeight-innerHeight);
                window.scrollTo(0,Math.min(700,max));
                const h=document.querySelector('header')?.getBoundingClientRect();
                return {y:scrollY,top:h?.top||0,bottom:h?.bottom||0};
                """,
            )
            require(isinstance(scrolled, dict), f"scroll state unreadable at {w}px")
            if float(scrolled.get("y", 0)) > float(state.get("hb", 0)) + 20:
                require(float(scrolled.get("bottom", 1)) < 0, f"header remained pinned after document scroll at {w}px: {scrolled}")
            execute(session, "window.scrollTo(0,0); return true;")

        print(
            "Privacy Center responsive Chrome geometry passed at 1180, 768, 390, and 320px: "
            "normal-flow compact header, quiet appearance control, compact brand icon, underline current-section marker, "
            "48px navigation targets, no document overflow, and scroll-away behavior verified."
        )
        return 0
    except Exception as exc:
        print(f"Privacy Center responsive Chrome geometry failed: {exc}")
        if log_path:
            try:
                print(Path(log_path).read_text(errors="replace")[-6000:])
            except OSError:
                pass
        return 1
    finally:
        if session:
            try:
                request("DELETE", f"/session/{session}")
            except Exception:
                pass
        for process in (driver, server):
            if process:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=5)
        if log_path:
            try:
                Path(log_path).unlink()
            except OSError:
                pass


if __name__ == "__main__":
    raise SystemExit(main())
