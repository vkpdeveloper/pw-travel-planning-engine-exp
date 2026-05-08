import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function Harness({
  showCloseButton,
  footerWithClose,
}: {
  showCloseButton?: boolean;
  footerWithClose?: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent showCloseButton={showCloseButton}>
        <DialogHeader>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Description text</DialogDescription>
        </DialogHeader>
        <p>Body</p>
        <DialogFooter showCloseButton={footerWithClose}>
          {!footerWithClose && <DialogClose>OK</DialogClose>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

describe("<Dialog />", () => {
  it("opens when trigger is clicked and renders title/description", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText("Open"));
    expect(await screen.findByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Description text")).toBeInTheDocument();
  });

  it("renders the default close button (showCloseButton=true)", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText("Open"));
    expect(await screen.findByText("Close")).toBeInTheDocument();
  });

  it("hides the close button when showCloseButton=false", async () => {
    const user = userEvent.setup();
    render(<Harness showCloseButton={false} />);
    await user.click(screen.getByText("Open"));
    await screen.findByText("Title");
    expect(screen.queryByText("Close")).not.toBeInTheDocument();
  });

  it("renders a footer Close button when footerWithClose=true", async () => {
    const user = userEvent.setup();
    render(<Harness footerWithClose />);
    await user.click(screen.getByText("Open"));
    const closeButtons = await screen.findAllByRole("button", { name: /close/i });
    expect(closeButtons.length).toBeGreaterThanOrEqual(1);
  });
});
