jest.mock("../Services/api", () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

jest.mock("react-toastify", () => ({
  toast: {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    dismiss: jest.fn(),
  },
}));

import Api from "../Services/api";
import { toast } from "react-toastify";
import {
  clearProviderServiceGateCache,
  countServicesFromPayload,
  getCachedProviderHasService,
  isProviderServiceSetupPath,
  markProviderHasService,
  notifyProviderServiceRequired,
  PROVIDER_SERVICE_REQUIRED_MESSAGE,
  resolveServiceProviderHomePath,
} from "./providerServiceGate";

describe("providerServiceGate", () => {
  beforeEach(() => {
    clearProviderServiceGateCache();
    Api.get.mockReset();
    toast.info.mockClear();
  });

  test("caches has-service flag", () => {
    expect(getCachedProviderHasService()).toBeNull();
    markProviderHasService(false);
    expect(getCachedProviderHasService()).toBe(false);
    markProviderHasService(true);
    expect(getCachedProviderHasService()).toBe(true);
    clearProviderServiceGateCache();
    expect(getCachedProviderHasService()).toBeNull();
  });

  test("allows only setup paths before first service", () => {
    expect(isProviderServiceSetupPath("/service/add")).toBe(true);
    expect(isProviderServiceSetupPath("/service/add?x=1")).toBe(true);
    expect(isProviderServiceSetupPath("/provider")).toBe(true);
    expect(isProviderServiceSetupPath("/requests")).toBe(false);
    expect(isProviderServiceSetupPath("/allmyservices")).toBe(false);
    expect(isProviderServiceSetupPath("/service/edit")).toBe(false);
  });

  test("counts services from API payload shapes", () => {
    expect(countServicesFromPayload({ data: [] })).toBe(0);
    expect(countServicesFromPayload({ data: [{ _id: "1" }] })).toBe(1);
    expect(countServicesFromPayload([{ _id: "1" }, { _id: "2" }])).toBe(2);
  });

  test("login home path is /service/add when provider has no services", async () => {
    Api.get.mockResolvedValue({ data: { data: [] } });
    await expect(resolveServiceProviderHomePath({ force: true })).resolves.toBe(
      "/service/add"
    );
    expect(getCachedProviderHasService()).toBe(false);
  });

  test("login home path is /requests when provider has services", async () => {
    Api.get.mockResolvedValue({ data: { data: [{ _id: "svc1" }] } });
    await expect(resolveServiceProviderHomePath({ force: true })).resolves.toBe(
      "/requests"
    );
    expect(getCachedProviderHasService()).toBe(true);
  });

  test("notifyProviderServiceRequired shows the required-service toast", () => {
    notifyProviderServiceRequired();
    expect(toast.dismiss).toHaveBeenCalledWith("provider-service-required");
    expect(toast.info).toHaveBeenCalledWith(
      PROVIDER_SERVICE_REQUIRED_MESSAGE,
      expect.objectContaining({ toastId: "provider-service-required" })
    );
  });
});
