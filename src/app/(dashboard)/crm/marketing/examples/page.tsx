import { notFound } from 'next/navigation'
import { MarketingExamples } from '@/modules/features/broadcasts/components/marketing-examples'

export default function MarketingExamplesPage() {
    if (process.env.NODE_ENV !== 'development') notFound()
    return <MarketingExamples />
}
