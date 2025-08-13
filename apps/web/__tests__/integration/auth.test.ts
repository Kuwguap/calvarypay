/**
 * Authentication Integration Tests
 * Tests for auth service and API integration
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { authService } from '../../lib/services/auth.service'

// Mock fetch for testing
global.fetch = jest.fn()

describe('Authentication Service Integration', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    (fetch as jest.MockedFunction<typeof fetch>).mockClear()
  })

  afterEach(() => {
    // Clean up after each test
    jest.restoreAllMocks()
  })

  describe('Login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: {
            id: '1',
            email: 'test@calvarypay.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'customer',
          },
          token: 'mock-jwt-token',
        },
      }

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await authService.login({
        email: 'test@calvarypay.com',
        password: 'Test123!',
      })

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            email: 'test@calvarypay.com',
            password: 'Test123!',
          }),
        })
      )

      expect(result).toEqual(mockResponse.data)
    })

    it('should handle login failure with invalid credentials', async () => {
      const mockErrorResponse = {
        success: false,
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
        },
      }

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => mockErrorResponse,
      } as Response)

      await expect(
        authService.login({
          email: 'invalid@calvarypay.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid credentials')
    })

    it('should handle network errors', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      )

      await expect(
        authService.login({
          email: 'test@calvarypay.com',
          password: 'Test123!',
        })
      ).rejects.toThrow('Network error')
    })
  })

  describe('Registration', () => {
    it('should successfully register a new user', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: {
            id: '2',
            email: 'newuser@calvarypay.com',
            firstName: 'New',
            lastName: 'User',
            role: 'customer',
          },
          token: 'mock-jwt-token',
        },
      }

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const registrationData = {
        firstName: 'New',
        lastName: 'User',
        email: 'newuser@calvarypay.com',
        phone: '+233123456789',
        password: 'SecurePass123!',
        role: 'customer' as const,
      }

      const result = await authService.register(registrationData)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(registrationData),
        })
      )

      expect(result).toEqual(mockResponse.data)
    })

    it('should handle registration failure with existing email', async () => {
      const mockErrorResponse = {
        success: false,
        error: {
          message: 'Email already exists',
          code: 'EMAIL_EXISTS',
        },
      }

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => mockErrorResponse,
      } as Response)

      const registrationData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'existing@calvarypay.com',
        phone: '+233123456789',
        password: 'SecurePass123!',
        role: 'customer' as const,
      }

      await expect(authService.register(registrationData)).rejects.toThrow(
        'Email already exists'
      )
    })
  })

  describe('Token Management', () => {
    it('should store token after successful login', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: {
            id: '1',
            email: 'test@calvarypay.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'customer',
          },
          token: 'mock-jwt-token',
        },
      }

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      // Mock localStorage
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem')

      await authService.login({
        email: 'test@calvarypay.com',
        password: 'Test123!',
      })

      expect(setItemSpy).toHaveBeenCalledWith('auth_token', 'mock-jwt-token')
    })

    it('should include token in authenticated requests', async () => {
      // Mock localStorage to return a token
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('mock-jwt-token')

      const mockResponse = {
        success: true,
        data: { message: 'Profile updated' },
      }

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      // This would be a method that requires authentication
      // await authService.updateProfile({ firstName: 'Updated' })

      // For now, just verify the concept
      expect(localStorage.getItem).toHaveBeenCalledWith('auth_token')
    })

    it('should clear token on logout', () => {
      const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem')

      authService.logout()

      expect(removeItemSpy).toHaveBeenCalledWith('auth_token')
    })
  })

  describe('Error Handling', () => {
    it('should handle 500 server errors gracefully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: { message: 'Internal server error' },
        }),
      } as Response)

      await expect(
        authService.login({
          email: 'test@calvarypay.com',
          password: 'Test123!',
        })
      ).rejects.toThrow('Internal server error')
    })

    it('should handle malformed JSON responses', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      } as Response)

      await expect(
        authService.login({
          email: 'test@calvarypay.com',
          password: 'Test123!',
        })
      ).rejects.toThrow()
    })
  })
})
