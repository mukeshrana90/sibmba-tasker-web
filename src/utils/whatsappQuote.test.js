import {
  buildWhatsAppQuoteMessage,
  buildWhatsAppQuoteUrl,
  formatWhatsAppPhone,
} from "./whatsappQuote";

describe("whatsappQuote", () => {
  it("formats phone with country code", () => {
    expect(
      formatWhatsAppPhone({ country_code: "+263", phone_number: "0771234567" })
    ).toBe("263771234567");
  });

  it("builds quote message with service name", () => {
    const message = buildWhatsAppQuoteMessage({
      providerName: "Hero",
      serviceName: "Barbers",
      userLocation: "Sector 91 Road",
    });
    expect(message).toContain("Hi Hero, I found you on Simba Tasker.");
    expect(message).toContain("Service: Barbers");
    expect(message).toContain("Location: Sector 91 Road");
  });

  it("builds wa.me url", () => {
    const url = buildWhatsAppQuoteUrl(
      { country_code: "263", phone_number: "771234567" },
      "Hello"
    );
    expect(url).toContain("https://wa.me/263771234567");
    expect(url).toContain("text=Hello");
  });
});
