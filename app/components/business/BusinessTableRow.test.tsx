import { describe, it, expect, afterEach } from '@jest/globals'
import { render, cleanup } from '@testing-library/react'
import { renderWithProviders, createMockBusiness } from '../../../__tests__/test-utils'
import { BusinessTableRow } from './BusinessTableRow'

describe('BusinessTableRow', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders business information correctly', () => {
    const business = createMockBusiness({
      name: '테스트 사업체',
      businessName: '식당',
      status: 'active',
    })

    const { getByText } = renderWithProviders(
      <table>
        <tbody>
          <BusinessTableRow business={business} index={0} />
        </tbody>
      </table>
    )

    expect(getByText('테스트 사업체')).toBeInTheDocument()
    expect(getByText('식당')).toBeInTheDocument()
  })

  it('displays correct status badge', () => {
    const business = createMockBusiness({ status: 'active' })

    const { container } = renderWithProviders(
      <table>
        <tbody>
          <BusinessTableRow business={business} index={0} />
        </tbody>
      </table>
    )

    const statusElements = container.querySelectorAll('td')
    const statusCell = Array.from(statusElements).find(cell => 
      cell.textContent?.includes('영업중')
    )
    expect(statusCell).toBeInTheDocument()
  })

  it('shows address correctly', () => {
    const business = createMockBusiness({
      roadNameAddress: '서울시 강남구 테헤란로 123',
    })

    const { container } = renderWithProviders(
      <table>
        <tbody>
          <BusinessTableRow business={business} index={0} />
        </tbody>
      </table>
    )

    const addressElement = container.querySelector('p')
    expect(addressElement).toHaveTextContent('서울시 강남구 테헤란로 123')
  })

  it('shows NEW badge when showNewBadge is true', () => {
    const business = createMockBusiness()

    const { getByText } = renderWithProviders(
      <table>
        <tbody>
          <BusinessTableRow business={business} showNewBadge={true} index={0} />
        </tbody>
      </table>
    )

    expect(getByText('NEW')).toBeInTheDocument()
  })

  it('has link to business detail page', () => {
    const business = createMockBusiness({ id: 'test-id-123' })

    const { container } = renderWithProviders(
      <table>
        <tbody>
          <BusinessTableRow business={business} index={0} />
        </tbody>
      </table>
    )

    const link = container.querySelector('a[href="/businesses/test-id-123"]')
    expect(link).toBeInTheDocument()
  })
})
