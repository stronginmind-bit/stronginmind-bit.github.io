"use strict";

const navToggle = document.querySelector(".nav-toggle");
const primaryNav = document.querySelector("#primary-nav");

if (navToggle && primaryNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = primaryNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.querySelector(".sr-only").textContent = isOpen ? "메뉴 닫기" : "메뉴 열기";
  });

  primaryNav.addEventListener("click", (event) => {
    if (event.target.matches("a")) {
      primaryNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.querySelector(".sr-only").textContent = "메뉴 열기";
    }
  });
}
