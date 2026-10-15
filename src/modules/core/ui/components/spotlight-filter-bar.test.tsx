import React, { useState } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpotlightFilterBar } from './spotlight-filter-bar'

afterEach(() => { cleanup(); vi.useRealTimers() })

const filters = [
  { id: 'all', label: 'Todas', count: 4 },
  { id: 'active', label: 'Activas', count: 2, subOptions: [{ id: 'blocked', label: 'Bloqueadas', count: 1 }] },
  { id: 'done', label: 'Completadas', count: 2 },
]

function TasksHarness() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('active')
  return <><SpotlightFilterBar filters={filters} searchTerm={search} onSearchChange={setSearch} activeFilter={status} onFilterChange={setStatus} /><output aria-label="Estado elegido">{status}</output></>
}

describe('Spotlight filters shared by task manager and portals', () => {
  it('searches, clears search and resets the active filter', () => {
    render(<TasksHarness />)
    const input = screen.getByRole('textbox', { name: 'Buscar...' })
    fireEvent.change(input, { target: { value: 'TK-42' } })
    expect(input).toHaveValue('TK-42')
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }))
    expect(input).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtro' }))
    expect(screen.getByLabelText('Estado elegido')).toHaveTextContent('all')
  })

  it('keeps filters available when keyboard focus leaves the search field', () => {
    render(<TasksHarness />)
    const input = screen.getByRole('textbox', { name: 'Buscar...' })
    fireEvent.focus(input)
    const completed = screen.getByRole('button', { name: /^Completadas/ })
    fireEvent.blur(input, { relatedTarget: completed })
    fireEvent.focus(completed)
    expect(completed.closest('[aria-hidden]')).toHaveAttribute('aria-hidden', 'false')
    fireEvent.click(completed)
    expect(screen.getByLabelText('Estado elegido')).toHaveTextContent('done')
  })

  it('opens subfilters with the keyboard and selects a subfilter', () => {
    render(<TasksHarness />)
    fireEvent.focus(screen.getByRole('textbox', { name: 'Buscar...' }))
    fireEvent.keyDown(screen.getByRole('button', { name: 'Activas' }), { key: 'ArrowDown' })
    const blocked = screen.getByRole('menuitemradio', { name: 'Activas › Bloqueadas' })
    fireEvent.click(blocked)
    expect(screen.getByLabelText('Estado elegido')).toHaveTextContent('blocked')
  })

  it('does not dismiss keyboard-focused subfilters when the pointer leaves', () => {
    render(<TasksHarness />)
    fireEvent.focus(screen.getByRole('textbox', { name: 'Buscar...' }))
    fireEvent.keyDown(screen.getByRole('button', { name: 'Activas' }), { key: 'ArrowDown' })
    const menu = screen.getByRole('menu', { name: 'Activas' })
    expect(menu).toContainElement(document.activeElement as HTMLElement)
    vi.useFakeTimers()
    fireEvent.mouseLeave(menu.parentElement!.parentElement!, { relatedTarget: document.body })
    act(() => vi.advanceTimersByTime(2100))
    expect(screen.getByRole('menuitemradio', { name: 'Activas › Bloqueadas' })).toBeInTheDocument()
  })
})
