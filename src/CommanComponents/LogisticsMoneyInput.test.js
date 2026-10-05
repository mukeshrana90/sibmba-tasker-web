import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LogisticsMoneyInput from "./LogisticsMoneyInput";

function Harness({ initial = "", onValue }) {
  const [v, setV] = useState(initial);
  return (
    <>
      <LogisticsMoneyInput
        aria-label="Price"
        value={v}
        onChange={(next) => {
          setV(next);
          onValue?.(next);
        }}
      />
      <button type="button">elsewhere</button>
    </>
  );
}

describe("LogisticsMoneyInput live .00 mask", () => {
  it("shows 12.00 while typing 12", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Price");
    expect(input).toHaveValue("");
    userEvent.type(input, "1");
    expect(input).toHaveValue("1.00");
    userEvent.type(input, "2");
    expect(input).toHaveValue("12.00");
    expect(input.selectionStart).toBe(2);
  });

  it("53 → 53.00, then .24 → 53.24", () => {
    const values = [];
    render(<Harness onValue={(v) => values.push(v)} />);
    const input = screen.getByLabelText("Price");
    userEvent.type(input, "53");
    expect(input).toHaveValue("53.00");
    userEvent.type(input, ".");
    expect(input).toHaveValue("53.00");
    expect(input.selectionStart).toBe(3);
    userEvent.type(input, "2");
    expect(input).toHaveValue("53.20");
    userEvent.type(input, "4");
    expect(input).toHaveValue("53.24");
    userEvent.type(input, "9");
    expect(input).toHaveValue("53.24");
    expect(values[values.length - 1]).toBe("53.24");
  });

  it("backspace walks back through the mask", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Price");
    userEvent.type(input, "53.2");
    expect(input).toHaveValue("53.20");
    userEvent.type(input, "{backspace}");
    expect(input).toHaveValue("53.00");
    userEvent.type(input, "{backspace}");
    expect(input).toHaveValue("53.00");
    expect(input.selectionStart).toBe(2);
    userEvent.type(input, "{backspace}");
    expect(input).toHaveValue("5.00");
    userEvent.type(input, "{backspace}");
    expect(input).toHaveValue("");
  });

  it("formats on blur and resumes editing a formatted value", () => {
    const values = [];
    render(<Harness initial="25" onValue={(v) => values.push(v)} />);
    const input = screen.getByLabelText("Price");
    expect(input).toHaveValue("25.00");
    userEvent.click(input);
    userEvent.tab();
    expect(values[values.length - 1]).toBe("25.00");
    userEvent.click(input);
    expect(input).toHaveValue("25.00");
    userEvent.type(input, "{backspace}4");
    expect(input).toHaveValue("24.00");
  });

  it("'.' first gives 0.xx and leading zeros are dropped", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Price");
    userEvent.type(input, ".5");
    expect(input).toHaveValue("0.50");
    userEvent.clear(input);
    userEvent.type(input, "07");
    expect(input).toHaveValue("7.00");
  });
});
