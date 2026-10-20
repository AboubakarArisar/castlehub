"use client";

/** A submit button that asks for confirmation before a destructive action. */
export function ConfirmButton({ message, ...props }: React.ComponentProps<"button"> & { message: string }) {
  return (
    <button
      type="submit"
      {...props}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    />
  );
}
