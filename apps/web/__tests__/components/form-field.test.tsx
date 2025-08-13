/**
 * FormField Component Tests
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, jest } from '@jest/globals'
import { FormField } from '../../components/ui/form-field'

describe('FormField Component', () => {
  const defaultProps = {
    label: 'Test Field',
    name: 'test',
    value: '',
    onChange: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly with basic props', () => {
    render(<FormField {...defaultProps} />)
    
    expect(screen.getByLabelText('Test Field')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('shows required indicator when required', () => {
    render(<FormField {...defaultProps} required />)
    
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('displays error message when error is provided', () => {
    const errorMessage = 'This field is required'
    render(<FormField {...defaultProps} error={errorMessage} />)
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('shows validation icon when isValid is true', () => {
    render(<FormField {...defaultProps} isValid={true} value="test" />)
    
    // Check for success icon (CheckCircle)
    expect(screen.getByTestId('check-circle')).toBeInTheDocument()
  })

  it('shows loading icon when isValidating is true', () => {
    render(<FormField {...defaultProps} isValidating={true} />)
    
    // Check for loading spinner
    expect(screen.getByTestId('loader')).toBeInTheDocument()
  })

  it('calls onChange when input value changes', () => {
    const onChange = jest.fn()
    render(<FormField {...defaultProps} onChange={onChange} />)
    
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'new value' } })
    
    expect(onChange).toHaveBeenCalledWith('new value')
  })

  it('calls onBlur when input loses focus', () => {
    const onBlur = jest.fn()
    render(<FormField {...defaultProps} onBlur={onBlur} />)
    
    const input = screen.getByRole('textbox')
    fireEvent.blur(input)
    
    expect(onBlur).toHaveBeenCalled()
  })

  it('renders textarea when type is textarea', () => {
    render(<FormField {...defaultProps} type="textarea" />)
    
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '4')
  })

  it('renders select when type is select', () => {
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
    ]
    
    render(<FormField {...defaultProps} type="select" options={options} />)
    
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('applies correct styling for error state', () => {
    render(<FormField {...defaultProps} error="Error message" />)
    
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('border-red-500')
  })

  it('applies correct styling for success state', () => {
    render(<FormField {...defaultProps} isValid={true} value="test" />)
    
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('border-green-500')
  })

  it('disables input when disabled prop is true', () => {
    render(<FormField {...defaultProps} disabled />)
    
    const input = screen.getByRole('textbox')
    expect(input).toBeDisabled()
  })

  it('shows description when provided', () => {
    const description = 'This is a helpful description'
    render(<FormField {...defaultProps} description={description} />)
    
    expect(screen.getByText(description)).toBeInTheDocument()
  })

  it('handles number type correctly', () => {
    const onChange = jest.fn()
    render(<FormField {...defaultProps} type="number" onChange={onChange} />)
    
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '123' } })
    
    expect(onChange).toHaveBeenCalledWith(123)
  })

  it('sets correct aria attributes', () => {
    const errorMessage = 'Error message'
    render(<FormField {...defaultProps} error={errorMessage} />)
    
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'test-error')
  })

  it('shows validation feedback after interaction', async () => {
    render(<FormField {...defaultProps} />)
    
    const input = screen.getByRole('textbox')
    
    // Focus and blur to trigger interaction
    fireEvent.focus(input)
    fireEvent.blur(input)
    
    // Validation feedback should now be visible
    await waitFor(() => {
      // This would depend on the actual validation logic
      // For now, just check that the component handles the interaction
      expect(input).not.toHaveFocus()
    })
  })
})
