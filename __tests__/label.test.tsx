import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Label } from "@/components/ui/label";

describe("<Label />", () => {
  it("renders its children with the label data-slot", () => {
    render(<Label>Email</Label>);
    const el = screen.getByText("Email");
    expect(el).toHaveAttribute("data-slot", "label");
  });

  it("merges custom className", () => {
    render(<Label className="custom-class">Field</Label>);
    expect(screen.getByText("Field")).toHaveClass("custom-class");
  });

  it("forwards htmlFor", () => {
    render(<Label htmlFor="my-field">Hi</Label>);
    expect(screen.getByText("Hi")).toHaveAttribute("for", "my-field");
  });
});
