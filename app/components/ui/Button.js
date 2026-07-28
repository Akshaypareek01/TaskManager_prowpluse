"use client";

import { forwardRef } from "react";
import Icon, { Spinner } from "./Icon";

const VARIANTS = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
  link: "btn-link",
};

const SIZES = {
  sm: "btn-sm",
  md: "btn-md",
  lg: "btn-lg",
  icon: "btn-icon",
};

/**
 * The only button in the product.
 *
 * @param {object} props
 * @param {"primary"|"secondary"|"ghost"|"danger"|"link"} [props.variant]
 * @param {"sm"|"md"|"lg"|"icon"} [props.size]
 * @param {string} [props.iconLeft] - Icon name rendered before the label
 * @param {string} [props.iconRight] - Icon name rendered after the label
 * @param {boolean} [props.loading] - swaps the leading icon for a spinner and disables
 * @param {string} [props.loadingLabel] - text shown while loading (falls back to children)
 * @param {boolean} [props.fullWidth]
 */
const Button = forwardRef(function Button(
  {
    variant = "secondary",
    size = "md",
    iconLeft,
    iconRight,
    loading = false,
    loadingLabel,
    fullWidth = false,
    className = "",
    children,
    disabled,
    type = "button",
    ...rest
  },
  ref
) {
  const iconSize = size === "lg" ? 18 : 16;

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`btn ${VARIANTS[variant] || VARIANTS.secondary} ${
        variant === "link" ? "" : SIZES[size] || SIZES.md
      } ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {loading ? (
        <Spinner size={iconSize} />
      ) : (
        iconLeft && <Icon name={iconLeft} size={iconSize} />
      )}
      {loading && loadingLabel ? loadingLabel : children}
      {!loading && iconRight && <Icon name={iconRight} size={iconSize} />}
    </button>
  );
});

export default Button;
