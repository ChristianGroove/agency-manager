import { act, fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ props: null as any, autoscroll: vi.fn() }))
vi.mock('react-virtuoso', async () => {
    const React = await import('react')
    return { Virtuoso: React.forwardRef((props: any, ref) => {
        mocks.props = props
        React.useImperativeHandle(ref, () => ({ autoscrollToBottom: mocks.autoscroll }))
        return <div>{props.data.map((msg: any, index: number) => <div key={msg.id}>{props.itemContent(props.firstItemIndex + index, msg)}</div>)}</div>
    }) }
})
vi.mock('../message-bubble', () => ({ MessageBubble: ({ content }: any) => <img alt="attachment" src={content.url || '/image.png'} /> }))
vi.mock('@/modules/core/i18n/use-translation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
import { MessageList } from './message-list'
const message = (id: string) => ({ id, content: { type: 'image', mediaUrl: '/image.png' }, created_at: '2026-10-09T12:00:00Z' }) as any
beforeEach(() => mocks.autoscroll.mockClear())
describe('chat scroll anchoring', () => {
    it('keeps the index stable on append and follows media resizing only while reading at the bottom', () => {
        const props = { firstItemIndex: 1000000, messages: [message('one')], loadingOlder: false, hasMoreMessages: false, onLoadOlder: vi.fn() }
        const { rerender, getAllByAltText } = render(<MessageList {...props} />)
        expect(mocks.props.initialTopMostItemIndex).toEqual({ index: 'LAST', align: 'end' })
        fireEvent.load(getAllByAltText('attachment')[0])
        expect(mocks.autoscroll).toHaveBeenCalledTimes(1)
        rerender(<MessageList {...props} messages={[...props.messages, message('two')]} />)
        expect(mocks.props.firstItemIndex).toBe(1000000)
        act(() => mocks.props.atBottomStateChange(false))
        fireEvent.load(getAllByAltText('attachment')[1])
        expect(mocks.autoscroll).toHaveBeenCalledTimes(1)
        rerender(<MessageList {...props} firstItemIndex={999999} messages={[message('older'), ...props.messages]} />)
        expect(mocks.props.firstItemIndex).toBe(999999)
        expect(props.messages[0].content).not.toHaveProperty('url')
    })
})
