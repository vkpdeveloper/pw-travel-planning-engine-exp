import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";

describe("<Button />", () => {
  it("renders its children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("applies variant and size data attributes", () => {
    render(
      <Button variant="outline" size="sm">
        Outlined
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Outlined" });
    expect(btn).toHaveAttribute("data-variant", "outline");
    expect(btn).toHaveAttribute("data-size", "sm");
  });

  it("fires onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await user.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Nope
      </Button>,
    );
    await user.click(screen.getByRole("button", { name: "Nope" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders as child element when asChild is set", () => {
    render(
      <Button asChild>
        <a href="/about">Link</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Link" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("data-slot", "button");
  });
});
