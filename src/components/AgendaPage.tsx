import { Event } from '../types/event';
import Stats from './Stats';
import MonthComparison from './MonthComparison';

interface AgendaPageProps {
    events: Event[];
}

export default function AgendaPage({ events }: AgendaPageProps) {
    return (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
            {/* Cabecera Simple */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Panel de Estadísticas</h1>
                    <p className="text-gray-500 mt-1">Análisis detallado del rendimiento y tendencias</p>
                </div>
            </div>

            {/* Estadísticas Principales */}
            <Stats events={events} />

            {/* Comparativa Interanual */}
            <section className="pt-4">
                <MonthComparison events={events} />
            </section>

            {/* Calendario Público */}
            <section className="pt-4 pb-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="font-semibold text-gray-900">Calendario Público</h3>
                        </div>
                        <span className="text-xs font-medium px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100">Google Calendar</span>
                    </div>
                    <div className="relative bg-white p-1">
                        <iframe
                            src="https://calendar.google.com/calendar/embed?height=600&wkst=2&ctz=Atlantic%2FCanary&showPrint=0&showTitle=0&showNav=0&showDate=0&showTabs=0&showCalendars=0&showTz=0&mode=AGENDA&src=YXRydWppbWFyQGdtYWlsLmNvbQ&color=%23039BE5"
                            className="w-full h-[500px] border-none rounded-xl"
                            scrolling="auto"
                            title="Google Calendar de eventos"
                        />
                    </div>
                </div>
            </section>
        </div>
    );
}
