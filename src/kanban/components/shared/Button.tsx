import * as React from 'react';
import { styled, css } from 'styled-components';

const ButtonBase = styled.button<{
  background: 'primary' | 'secondary' | 'danger';
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  outline: none;
  cursor: pointer;
  border-radius: var(--border-radius);
  line-height: 20px;
  padding: 6px 14px;
  font-size: 0.875rem;
  font-weight: 500;
  ${(properties) =>
    properties.background === 'danger'
      ? css`
          color: var(--button-text-color, #ffffff);
          background-color: var(--danger-color);
        `
      : css`
          color: var(--text-color);
          background-color: var(--button-color);
          border: 1px solid var(--form-border-color);
        `}
  transition:
    border-color 120ms ease-in-out,
    background-color 120ms ease-in-out;
  &:hover {
    ${(properties) =>
      properties.background === 'danger'
        ? css`
            background-color: #b91c1c !important;
          `
        : css`
            border-color: var(--primary-color) !important;
          `}
  }
`;

const Label = styled.span`
  line-height: 1.25rem;
  border: none;
  background-color: transparent;
`;

type Properties = {
  text: string;
  icon?: React.ReactElement;
  type?: 'primary' | 'secondary' | 'danger';
  disabled: boolean;
  onClick: () => void;
};

export const Button = ({ text, icon = undefined, type = 'secondary', disabled = false, onClick }: Properties) => {
  return (
    <ButtonBase
      background={type}
      disabled={disabled}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {icon}
      <Label>{text}</Label>
    </ButtonBase>
  );
};
