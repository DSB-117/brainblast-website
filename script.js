const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-button]");
const mobileNav = document.querySelector("[data-mobile-nav]");
const toast = document.querySelector("[data-toast]");
const copyButtons = document.querySelectorAll("[data-copy]");

const syncHeader = () => {
  header.classList.toggle("is-scrolled", window.scrollY > 16);
};

const fallbackCopy = (value) => {
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.left = "-9999px";
  document.body.append(input);
  input.select();

  const copied = document.execCommand("copy");
  input.remove();
  return copied;
};

const showToast = (message) => {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.setTimeout(() => toast.classList.remove("is-visible"), 1400);
};

window.addEventListener("scroll", syncHeader, { passive: true });
syncHeader();

menuButton.addEventListener("click", () => {
  const isOpen = mobileNav.classList.toggle("is-open");
  menuButton.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
});

mobileNav.addEventListener("click", (event) => {
  if (event.target.matches("a")) {
    mobileNav.classList.remove("is-open");
    menuButton.setAttribute("aria-label", "Open menu");
  }
});

copyButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const value = button.getAttribute("data-copy");

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(value);
      } else if (!fallbackCopy(value)) {
        throw new Error("copy failed");
      }

      showToast("Copied");
    } catch {
      const copied = fallbackCopy(value);
      showToast(copied ? "Copied" : "Select the command");
      button.textContent = copied ? "Copied" : "Copy unavailable";
      window.setTimeout(() => {
        button.textContent = "Copy";
      }, 1800);
    }
  });
});
