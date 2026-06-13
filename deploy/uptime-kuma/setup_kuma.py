#!/usr/bin/env python3
"""Config-as-code voor UptimeKuma Laag 4: admin + webhook-notificatie + 6 monitors.
Idempotent waar mogelijk. Draait in een wegwerp-container op het monitor-net.
"""
import os
import sys
from uptime_kuma_api import UptimeKumaApi, MonitorType, NotificationType

URL = os.environ.get("KUMA_URL", "http://uptime-kuma:3001")
USER = os.environ.get("KUMA_USER", "admin")
PASS = os.environ["KUMA_PASS"]
RELAY = "http://threema-relay:8099/notify"

MONITORS = [
    ("prod-holidaibutler", "https://holidaibutler.com"),
    ("prod-calpetrip", "https://calpetrip.com"),
    ("prod-texelmaps", "https://texelmaps.nl"),
    ("prod-api-health", "https://api.holidaibutler.com/health"),
    ("prod-admin", "https://admin.holidaibutler.com"),
    ("prod-grafana", "https://grafana.holidaibutler.com"),
]

api = UptimeKumaApi(URL, timeout=30)
try:
    if api.need_setup():
        api.setup(USER, PASS)
        print("SETUP: admin aangemaakt")
    else:
        print("SETUP: al geconfigureerd (skip)")
    api.login(USER, PASS)
    print("LOGIN: ok")

    # Webhook-notificatie (default + apply op bestaande)
    existing = {n["name"]: n["id"] for n in api.get_notifications()}
    if "Threema relay" in existing:
        notif_id = existing["Threema relay"]
        print(f"NOTIF: bestaat al (id={notif_id})")
    else:
        r = api.add_notification(
            name="Threema relay",
            type=NotificationType.WEBHOOK,
            isDefault=True,
            applyExisting=True,
            webhookURL=RELAY,
            webhookContentType="json",
        )
        notif_id = r["id"]
        print(f"NOTIF: aangemaakt (id={notif_id})")

    have = {m["name"] for m in api.get_monitors()}
    for name, url in MONITORS:
        if name in have:
            print(f"MON: {name} bestaat al (skip)")
            continue
        api.add_monitor(
            type=MonitorType.HTTP, name=name, url=url,
            interval=60, maxretries=2, retryInterval=60,
            notificationIDList={notif_id: True},
        )
        print(f"MON: {name} -> {url} aangemaakt")

    print("KLAAR: %d monitors totaal" % len(api.get_monitors()))
finally:
    api.disconnect()
