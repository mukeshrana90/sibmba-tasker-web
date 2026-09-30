import {
  buildJobPopupHtml,
  isLocalNowJob,
  fleetMapDataKey,
  vehicleMapPinTone,
} from "../CommanComponents/LogisticsFleetMap";

describe("vehicleMapPinTone", () => {
  it("maps availability to offline / available / on_route", () => {
    expect(vehicleMapPinTone("offline")).toBe("offline");
    expect(vehicleMapPinTone(null)).toBe("offline");
    expect(vehicleMapPinTone("on_job")).toBe("on_route");
    expect(vehicleMapPinTone("available_now")).toBe("available");
    expect(vehicleMapPinTone("returning_empty")).toBe("available");
    expect(vehicleMapPinTone("scheduled")).toBe("available");
  });
});

describe("buildJobPopupHtml", () => {
  it("shows pickup, drop-off and needed date", () => {
    const html = buildJobPopupHtml({
      label: "Shop Items",
      pickupLabel: "HF65+MQ Tikhore, Maharashtra, India",
      dropoffLabel: "Pune, Maharashtra, India",
      createdLabel: "18 Sep 2026",
      neededLabel: "29 Sep 2026",
    });
    expect(html).toContain("<b>Shop Items</b>");
    expect(html).toContain("<b>Pickup:</b> HF65+MQ Tikhore, Maharashtra, India");
    expect(html).toContain("<b>Drop-off:</b> Pune, Maharashtra, India");
    expect(html).toContain("<b>Needed:</b> 29 Sep 2026");
    expect(html).not.toContain("Created:");
  });

  it("shows Site when pickup and drop-off match", () => {
    const html = buildJobPopupHtml({
      label: "Plough hire",
      pickupLabel: "Mohali, Punjab",
      dropoffLabel: "Mohali, Punjab",
    });
    expect(html).toContain("Site: Mohali, Punjab");
    expect(html).not.toContain("Pickup:");
  });
});

describe("LogisticsFleetMap data key", () => {
  it("stays stable when vehicle object identity changes but coords match", () => {
    const a = fleetMapDataKey(
      [
        {
          asset_id: "1",
          name: "Truck",
          availability: "offline",
          live_location: { lat: -17.8, lng: 31.0, operator_name: "You" },
        },
      ],
      [],
      true,
      false
    );
    const b = fleetMapDataKey(
      [
        {
          asset_id: "1",
          name: "Truck",
          availability: "offline",
          live_location: { lat: -17.8, lng: 31.0, operator_name: "You" },
        },
      ],
      [],
      true,
      false
    );
    expect(a).toBe(b);
  });

  it("changes when status update would move the pin", () => {
    const a = fleetMapDataKey(
      [{ asset_id: "1", live_location: { lat: 1, lng: 2 } }],
      [],
      true,
      false
    );
    const b = fleetMapDataKey(
      [{ asset_id: "1", live_location: { lat: 1, lng: 3 } }],
      [],
      true,
      false
    );
    expect(a).not.toBe(b);
  });

  it("changes when availability tone changes", () => {
    const a = fleetMapDataKey(
      [
        {
          asset_id: "1",
          availability: "available_now",
          live_location: { lat: 1, lng: 2 },
        },
      ],
      [],
      true,
      false
    );
    const b = fleetMapDataKey(
      [
        {
          asset_id: "1",
          availability: "on_job",
          live_location: { lat: 1, lng: 2 },
        },
      ],
      [],
      true,
      false
    );
    expect(a).not.toBe(b);
  });
});

describe("local (Now) jobs on the fleet map", () => {
  it("detects Now jobs only when local with an expiry", () => {
    expect(isLocalNowJob({ job_class: "local", expires_at: "2026-09-24T12:00:00Z" })).toBe(true);
    expect(isLocalNowJob({ job_class: "local" })).toBe(false);
    expect(isLocalNowJob({ job_class: "corridor", expires_at: "x" })).toBe(false);
  });

  it("popup shows the Now badge, expiry and a quote link", () => {
    const html = buildJobPopupHtml({
      label: "Bricks",
      local: true,
      expiresLabel: "06:15 PM",
      pickupLabel: "Sector 71",
      dropoffLabel: "Sector 66",
      href: "/logistics/owner/job/abc",
    });
    expect(html).toContain("Local job (Now)");
    expect(html).toContain("expires 06:15 PM");
    expect(html).toContain('href="/logistics/owner/job/abc"');
  });

  it("data key changes when the local-jobs toggle changes", () => {
    const jobs = [{ job_id: "1", lat: 1, lng: 2, job_class: "local", expires_at: "t" }];
    expect(fleetMapDataKey([], jobs, true, true, true)).not.toBe(
      fleetMapDataKey([], jobs, true, true, false)
    );
  });
});
