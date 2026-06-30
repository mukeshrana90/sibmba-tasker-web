import {
  DEFAULT_BOOKING_MAP_CENTER,
  coordsFromInitial,
  coordsFromStorage,
  draftFromPlace,
  draftFromPrediction,
  hasValidCoords,
  resolveBookingPickerDraft,
} from "./bookingLocationPicker";

describe("hasValidCoords", () => {
  it("accepts valid lat/lng", () => {
    expect(hasValidCoords({ lat: -17.8, lng: 31.05 })).toBe(true);
  });

  it("rejects missing or zero coords", () => {
    expect(hasValidCoords(null)).toBe(false);
    expect(hasValidCoords({ lat: 0, lng: 0 })).toBe(false);
    expect(hasValidCoords({ lat: "bad", lng: 1 })).toBe(false);
  });
});

describe("coordsFromInitial", () => {
  it("normalizes numeric strings", () => {
    expect(coordsFromInitial({ lat: "-17.8", lng: "31.05" })).toEqual({
      lat: -17.8,
      lng: 31.05,
    });
  });
});

describe("coordsFromStorage", () => {
  const original = global.localStorage;

  beforeEach(() => {
    const store = {};
    global.localStorage = {
      getItem: (key) => store[key] ?? null,
      setItem: (key, value) => {
        store[key] = String(value);
      },
    };
  });

  afterEach(() => {
    global.localStorage = original;
  });

  it("reads stored device coordinates", () => {
    localStorage.setItem("latitude", "30.71");
    localStorage.setItem("longitude", "76.70");
    expect(coordsFromStorage()).toEqual({ lat: 30.71, lng: 76.7 });
  });
});

describe("resolveBookingPickerDraft", () => {
  it("uses initial location when address and coords are present", async () => {
    const draft = await resolveBookingPickerDraft({
      address: "Mohali, India",
      lat: 30.71,
      lng: 76.7,
    });
    expect(draft).toEqual({
      address: "Mohali, India",
      lat: 30.71,
      lng: 76.7,
    });
  });

  it("reverse geocodes initial coords when address is missing", async () => {
    const reverseGeocode = jest.fn().mockResolvedValue({
      lat: 30.71,
      lng: 76.7,
      label: "Mohali Railway Station Rd, India",
    });

    const draft = await resolveBookingPickerDraft(
      { lat: 30.71, lng: 76.7 },
      { reverseGeocode, getStoredCoords: () => null, requestLocation: jest.fn() }
    );

    expect(reverseGeocode).toHaveBeenCalledWith(30.71, 76.7);
    expect(draft.address).toBe("Mohali Railway Station Rd, India");
  });

  it("falls back to stored device location when initial is absent", async () => {
    const reverseGeocode = jest.fn().mockResolvedValue({
      lat: -17.82,
      lng: 31.05,
      label: "Harare, Zimbabwe",
    });

    const draft = await resolveBookingPickerDraft(null, {
      reverseGeocode,
      getStoredCoords: () => ({ lat: -17.82, lng: 31.05 }),
      requestLocation: jest.fn(),
    });

    expect(draft.address).toBe("Harare, Zimbabwe");
  });

  it("requests device location when no initial or stored coords exist", async () => {
    const reverseGeocode = jest.fn().mockResolvedValue({
      lat: -17.82,
      lng: 31.05,
      label: "Harare, Zimbabwe",
    });
    const requestLocation = jest.fn().mockResolvedValue({ lat: -17.82, lng: 31.05 });

    const draft = await resolveBookingPickerDraft(null, {
      reverseGeocode,
      getStoredCoords: () => null,
      requestLocation,
    });

    expect(requestLocation).toHaveBeenCalled();
    expect(draft.lat).toBe(-17.82);
    expect(draft.lng).toBe(31.05);
  });

  it("uses default center when geolocation is denied", async () => {
    const reverseGeocode = jest
      .fn()
      .mockResolvedValueOnce({
        lat: DEFAULT_BOOKING_MAP_CENTER.lat,
        lng: DEFAULT_BOOKING_MAP_CENTER.lng,
        label: "Harare, Zimbabwe",
      });

    const draft = await resolveBookingPickerDraft(null, {
      reverseGeocode,
      getStoredCoords: () => null,
      requestLocation: jest.fn().mockRejectedValue(new Error("denied")),
    });

    expect(reverseGeocode).toHaveBeenCalledWith(
      DEFAULT_BOOKING_MAP_CENTER.lat,
      DEFAULT_BOOKING_MAP_CENTER.lng
    );
    expect(draft.address).toBe("Harare, Zimbabwe");
  });
});

describe("draftFromPlace", () => {
  it("reads Google place geometry", () => {
    expect(
      draftFromPlace({
        formatted_address: "Harare, Zimbabwe",
        geometry: {
          location: {
            lat: () => -17.82,
            lng: () => 31.05,
          },
        },
      })
    ).toEqual({
      address: "Harare, Zimbabwe",
      lat: -17.82,
      lng: 31.05,
    });
  });
});

describe("draftFromPrediction", () => {
  it("builds draft from photon prediction", () => {
    expect(
      draftFromPrediction({
        isPhoton: true,
        description: "Harare, Zimbabwe",
        lat: -17.82,
        lng: 31.05,
      })
    ).toEqual({
      address: "Harare, Zimbabwe",
      lat: -17.82,
      lng: 31.05,
    });
  });
});
