import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useState, useEffect } from 'react'
import { supabaseClient } from '../supabase/supabaseClient'

const DashboardCalendar = ({ events }) => {
  return (
    <FullCalendar
      plugins={[dayGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      events={events}
      height="auto"
    />
  )
}

export default DashboardCalendar