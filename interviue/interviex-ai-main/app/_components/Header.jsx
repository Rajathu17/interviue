"use client";
import React from "react";
import NavItem from "./NavItem";
import Button from "./Button";
import { UserButton } from "@clerk/nextjs";
import { Link, NavLink } from "react-router-dom";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "About", href: "#" },
  { label: "Features", href: "#" },
];

function Header() {
  return (
    <header className="flex flex-col justify-center self-stretch py-4">
      <div className="flex justify-center items-center px-8 w-full max-md:px-5 max-md:max-w-full">
        <div className="flex flex-col justify-center w-full max-w-screen-xl max-md:max-w-full">
          <nav className="flex gap-5 justify-between mt-4 w-full max-md:flex-wrap max-md:max-w-full">
            <a href="/">
              <h1 className="flex flex-col justify-center my-auto text-2xl font-semibold leading-8 bg-clip-text text-white">
                Interviax AI
              </h1>
            </a>
            <ul className="flex gap-5 justify-between items-center text-sm leading-5 text-white  max-md:flex-wrap">
              {navItems.map((item, index) => (
                <NavItem key={index} label={item.label} href={item.href} />
              ))}
              <li className="ml-2">
                <UserButton />
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;
