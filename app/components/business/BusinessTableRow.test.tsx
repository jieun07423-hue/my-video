import { describe, it, expect } from '@jest/globals'
import { renderWithProviders, createMockBusiness } from '../../../__tests__/test-utils'
import { BusinessTableRow } from './BusinessTableRow'

describe('BusinessTableRow', () => {
  it('renders business information correctly', () => {
    const business = createMockBusiness({
      name: '테스트 사업체',
      businessName: '식당',
      status: 'active',
    })

    const { getByText } = renderWithProviders(
      <BusinessTableRow business={business} index={0} />
    )

    expect(getByText('테스트 사업체')).toBeInTheDocument()
    expect(getByText('식당')).toBeInTheDocument()
  })

  it('displays correct status badge', () => {
    const business = createMockBusiness({ status: 'active' })

    const { getByText } = renderWithProviders(
      <BusinessTableRow business={business} index={0} />
    )

    expect(getByText('영업중')).toBeInTheDocument()
  })

  it('shows address correctly', () => {
    const business = createMockBusiness({
      roadNameAddress: '서울시 강남구 테헤란로 123',
    })

    const { getByText } = renderWithProviders(
      <BusinessTableRow business={business} index={0} />
    )

    expect(getByText('서울시 강남구 테헤란로 123')).toBeInTheDocument()
  })

  it('shows NEW badge when showNewBadge is true', () => {
    const business = createMockBusiness()

    const { getByText } = renderWithProviders(
      <BusinessTableRow business={business} showNewBadge={true} index={0} />
    )

    expect(getByText('NEW')).toBeInTheDocument()
  })

  it('has link to business detail page', () => {
    const business = createMockBusiness({ id: 'test-id-123' })

    const { getByText } = renderWithProviders(
      <BusinessTableRow business={business} index={0} />
    )

    const link = getByText('상세').closest('a')
    expect(link).toHaveAttribute('href', '/businesses/test-id-123')
  })
})
