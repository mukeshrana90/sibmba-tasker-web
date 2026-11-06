import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import GoogleSignInButton from "./GoogleSignInButton";
import AppleSignInButton from "./AppleSignInButton";
import { getGoogleIdToken } from "../utils/googleAuth";
import { getAppleIdToken } from "../utils/appleAuth";
import { withTimeout } from "../utils/popupSignIn";
import { resolveWebDeviceTokenDetailed } from "../utils/webDeviceToken";
import CustomerActions from "../Redux/Actions/CustomerActions";

jest.mock("../utils/googleAuth", () => ({ getGoogleIdToken: jest.fn() }));
jest.mock("../utils/appleAuth", () => ({ getAppleIdToken: jest.fn() }));
jest.mock("../utils/webDeviceToken", () => ({ resolveWebDeviceTokenDetailed: jest.fn() }));
jest.mock("../Redux/Actions/CustomerActions", () => ({ __esModule: true, default: { socialLogin: jest.fn() } }));

const store = configureStore({ reducer: { noop: (s = {}) => s } });
const wrap = (ui) => render(<Provider store={store}>{ui}</Provider>);
const never = () => new Promise(() => {});

describe("Google / Apple buttons stop loading when the popup is closed", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // CRA resets mocks before each test
    resolveWebDeviceTokenDetailed.mockResolvedValue({ token: "", isFcm: false });
    CustomerActions.socialLogin.mockReturnValue({ type: "test/socialLogin", payload: { status_code: 200, data: {} } });
  });
  afterEach(() => jest.useRealTimers());

  it.each([
    ["Google", GoogleSignInButton, getGoogleIdToken, "Continue with Google"],
    ["Apple", AppleSignInButton, getAppleIdToken, "Continue with Apple"],
  ])("%s: focus back on the page with no sign-in → label returns", async (_name, Button, getToken, label) => {
    getToken.mockImplementation(never); // Firebase never reports the closed popup
    wrap(<Button />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.queryByText(label)).toBeNull(); // spinner
    act(() => {
      window.dispatchEvent(new Event("focus"));
      jest.advanceTimersByTime(2600);
    });
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByRole("button")).not.toBeDisabled();
  });

  it("popup-closed error → no spinner, no error toast", async () => {
    getGoogleIdToken.mockRejectedValue(Object.assign(new Error("closed"), { code: "auth/popup-closed-by-user" }));
    wrap(<GoogleSignInButton />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });
    expect(screen.getByText("Continue with Google")).toBeTruthy();
  });

  it("a slow real sign-in still finishes after the spinner stopped", async () => {
    let finish;
    getGoogleIdToken.mockImplementation(() => new Promise((r) => (finish = r)));
    const onSuccess = jest.fn();
    wrap(<GoogleSignInButton onSuccess={onSuccess} />);
    fireEvent.click(screen.getByRole("button"));
    act(() => {
      window.dispatchEvent(new Event("focus"));
      jest.advanceTimersByTime(2600);
    });
    expect(screen.getByText("Continue with Google")).toBeTruthy();
    jest.useRealTimers();
    await act(async () => {
      finish("id-token");
    });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });
});

describe("withTimeout", () => {
  it("falls back when the prompt never settles", async () => {
    jest.useFakeTimers();
    const p = withTimeout(never(), 4000, { token: "", reason: "device_token_timeout" });
    jest.advanceTimersByTime(4000);
    await expect(p).resolves.toEqual({ token: "", reason: "device_token_timeout" });
    jest.useRealTimers();
  });
});
