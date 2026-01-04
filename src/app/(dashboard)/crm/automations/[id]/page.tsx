'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'

// This page simply re-exports the original editor from /automations/[id]
// To avoid code duplication, we redirect to the legacy location which handles everything
// Note: The actual redirect happens via Next.js config for backward compat
// For CRM context, we load the existing editor component

import WorkflowEditorPage from '../../../automations/[id]/page'

export default function CRMWorkflowEditorPage() {
    return <WorkflowEditorPage />
}
