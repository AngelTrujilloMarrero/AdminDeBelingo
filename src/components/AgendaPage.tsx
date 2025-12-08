import { Event } from '../types/event';
import Stats from './Stats';

interface AgendaPageProps {
    events: Event[];
}

export default function AgendaPage({ events }: AgendaPageProps) {
    return (
        <div className="space-y-8 animate-fade-in">
            {/* Sección de Estadísticas */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-2xl shadow-lg">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <h2 className="text-2xl font-bold">Estadísticas Globales</h2>
                    </div>
                </div>
                <Stats events={events} />
            </section>

            {/* Google Calendar Embed */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    {/* Header del calendario */}
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6">
                        <div className="flex items-center justify-center space-x-2">
                            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <h2 className="text-xl font-bold text-white">Google Calendar</h2>
                        </div>
                        <p className="text-center text-white/80 text-sm mt-2">
                            Calendario público de eventos
                        </p>
                    </div>

                    {/* Iframe del calendario */}
                    <div className="relative">
                        <iframe
                            src="https://calendar.google.com/calendar/embed?height=600&wkst=2&ctz=Atlantic%2FCanary&showPrint=0&showTitle=0&showNav=0&showDate=0&showTabs=0&showCalendars=0&showTz=0&mode=AGENDA&src=YXRydWppbWFyQGdtYWlsLmNvbQ&color=%23039BE5"
                            className="w-full h-[600px] md:h-[500px] sm:h-[400px] border-none"
                            scrolling="auto"
                            title="Google Calendar de eventos"
                        />

                        {/* Overlay de carga */}
                        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center pointer-events-none opacity-0 transition-opacity duration-500">
                            <div className="text-center">
                                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                <p className="text-gray-600">Cargando calendario...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
