import React from "react";
import { DummyImageHook, useDummyImage } from "../Hooks/UseDummyImage";

export type DummyImageProps = {
  /** CSS style prop */
  style?: React.CSSProperties;
  /** Custom className */
  className?: string;
  /** Image alt prop */
  alt?: string;
} & DummyImageHook;

export const DummyImage = ({
  shape = "text",
  width = 300,
  height = 300,
  bgColor = "#e5e5e5",
  fgColor = "#f9f9f9",
  placeholder = `${width} x ${height}`,
  fontFamily = "sans-serif",
  style,
  className = "dummy-img",
  alt = "dummy-img",
}: DummyImageProps) => {
  const image = useDummyImage({
    shape,
    width,
    height,
    bgColor,
    fgColor,
    placeholder,
    fontFamily,
  });

  return (
    <img
      src={image}
      style={{ maxWidth: "100%", height: "auto", ...style }}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading="lazy"
    />
  );
};
