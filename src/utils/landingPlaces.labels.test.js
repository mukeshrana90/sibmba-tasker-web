import { readableGeocodeLabel, streetSuburbLabel, stripPlusCode } from "./landingPlaces";
import { draftFromPlace } from "./bookingLocationPicker";

const part = (long_name, ...types) => ({ long_name, short_name: long_name, types });

const STREET_ADDRESS = {
  formatted_address: "12 Samora Machel Ave, Harare, Zimbabwe",
  types: ["street_address"],
  address_components: [
    part("12", "street_number"),
    part("Samora Machel Avenue", "route"),
    part("Avondale", "sublocality_level_1", "sublocality", "political"),
    part("Harare", "locality", "political"),
    part("Harare Province", "administrative_area_level_1", "political"),
    part("Zimbabwe", "country", "political"),
  ],
};

const PLUS_CODE = {
  formatted_address: "464Q+H9G, Harare, Zimbabwe",
  types: ["plus_code"],
  address_components: [
    part("464Q+H9G", "plus_code"),
    part("Harare", "locality", "political"),
    part("Zimbabwe", "country", "political"),
  ],
};

const SUBURB = {
  formatted_address: "Avondale, Harare, Zimbabwe",
  types: ["sublocality_level_1", "sublocality", "political"],
  address_components: [
    part("Avondale", "sublocality_level_1", "sublocality", "political"),
    part("Harare", "locality", "political"),
    part("Zimbabwe", "country", "political"),
  ],
};

describe("streetSuburbLabel", () => {
  it("builds street, suburb, city", () => {
    expect(streetSuburbLabel(STREET_ADDRESS)).toBe("12 Samora Machel Avenue, Avondale, Harare");
  });

  it("works without a street number or suburb, and repeats no names", () => {
    expect(
      streetSuburbLabel({
        formatted_address: "Harare Dr, Harare, Zimbabwe",
        address_components: [
          part("Harare Drive", "route"),
          part("Harare", "sublocality", "political"),
          part("Harare", "locality", "political"),
        ],
      })
    ).toBe("Harare Drive, Harare");
  });

  it("uses the result's own address when there is no street", () => {
    expect(streetSuburbLabel(SUBURB)).toBe("Avondale, Harare, Zimbabwe");
  });

  it("uses suburb and city for a plus code result, never the code", () => {
    expect(streetSuburbLabel(PLUS_CODE)).toBe("Harare");
  });

  it("skips an unnamed road", () => {
    expect(
      streetSuburbLabel({
        formatted_address: "Unnamed Road, Harare, Zimbabwe",
        types: ["route"],
        address_components: [part("Unnamed Road", "route"), part("Harare", "locality", "political")],
      })
    ).toBe("Harare");
  });

  it("gives nothing for a bare code with no components", () => {
    expect(streetSuburbLabel({ formatted_address: "464Q+H9G" })).toBe("");
  });

  it("strips the code from an address with no components", () => {
    expect(streetSuburbLabel({ formatted_address: "464Q+H9G, Harare, Zimbabwe" })).toBe("Harare, Zimbabwe");
  });
});

describe("stripPlusCode", () => {
  it("drops a leading code", () => {
    expect(stripPlusCode("PPF2+82Q, Sahibzada Ajit Singh Nagar")).toBe("Sahibzada Ajit Singh Nagar");
    expect(stripPlusCode("5G6Q464Q+H9G Harare")).toBe("Harare");
  });

  it("returns nothing for a bare code", () => {
    expect(stripPlusCode("464Q+H9G")).toBe("");
  });

  it("leaves ordinary addresses alone", () => {
    expect(stripPlusCode("12 Samora Machel Ave, Harare")).toBe("12 Samora Machel Ave, Harare");
  });
});

describe("readableGeocodeLabel", () => {
  it("skips a leading plus code result", () => {
    expect(readableGeocodeLabel([PLUS_CODE, STREET_ADDRESS, SUBURB])).toBe("12 Samora Machel Avenue, Avondale, Harare");
  });

  it("falls back to the first non-code result", () => {
    expect(readableGeocodeLabel([PLUS_CODE, SUBURB])).toBe("Avondale, Harare, Zimbabwe");
  });

  it("uses the code result's suburb or city when only codes came back", () => {
    expect(readableGeocodeLabel([PLUS_CODE])).toBe("Harare");
  });

  it("never returns a bare code", () => {
    expect(readableGeocodeLabel([{ formatted_address: "464Q+H9G", types: ["plus_code"] }])).toBe("");
    expect(readableGeocodeLabel([])).toBe("");
    expect(readableGeocodeLabel(null)).toBe("");
  });
});

describe("draftFromPlace labels", () => {
  const geometry = { location: { lat: () => -17.8, lng: () => 31.05 } };

  it("uses street and suburb from a search result", () => {
    expect(draftFromPlace({ ...STREET_ADDRESS, geometry }).address).toBe("12 Samora Machel Avenue, Avondale, Harare");
  });

  it("never keeps a plus code from a search result", () => {
    expect(draftFromPlace({ ...PLUS_CODE, geometry }).address).toBe("Harare");
    expect(draftFromPlace({ formatted_address: "464Q+H9G", name: "464Q+H9G", geometry }).address).toBe("");
  });

  it("falls back to the place name", () => {
    expect(draftFromPlace({ name: "Sam Levy's Village", geometry }).address).toBe("Sam Levy's Village");
  });
});
