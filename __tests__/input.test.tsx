import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "@/components/ui/input";

describe("<Input />", () => {
  it("renders a textarea with the input data-slot", () => {
    render(<Input placeholder="Type here" />);
    const el = screen.getByPlaceholderText("Type here");
    expect(el.tagName).toBe("TEXTAREA");
    expect(el).toHaveAttribute("data-slot", "input");
  });

  it("forwards the ref", () => {
    const ref = { current: null as HTMLTextAreaElement | null };
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("calls onSubmit when Enter is pressed without Shift", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Input onSubmit={onSubmit} aria-label="msg" />);
    const el = screen.getByLabelText("msg");
    await user.click(el);
    await user.keyboard("hello{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onSubmit when Shift+Enter is pressed", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Input onSubmit={onSubmit} aria-label="msg" />);
    const el = screen.getByLabelText("msg");
    await user.click(el);
    await user.keyboard("hello{Shift>}{Enter}{/Shift}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("forwards onKeyDown alongside the submit handler", async () => {
    const user = userEvent.setup();
    const onKeyDown = vi.fn();
    const onSubmit = vi.fn();
    render(<Input onKeyDown={onKeyDown} onSubmit={onSubmit} aria-label="msg" />);
    await user.click(screen.getByLabelText("msg"));
    await user.keyboard("a");
    expect(onKeyDown).toHaveBeenCalled();
  });

  it("works without onSubmit handler (Enter is still prevented)", async () => {
    const user = userEvent.setup();
    render(<Input aria-label="msg" />);
    const el = screen.getByLabelText("msg") as HTMLTextAreaElement;
    await user.click(el);
    await user.keyboard("hi{Enter}");
    expect(el.value).toBe("hi");
  });
});
