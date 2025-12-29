
import { NormalizedSocialMetrics } from "@/lib/integrations/meta/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, BarChart2, Heart, Share2, ImageIcon, ExternalLink } from "lucide-react"

interface SocialDashboardProps {
    data: NormalizedSocialMetrics
}

export function SocialDashboard({ data }: SocialDashboardProps) {
    if (!data) return null

    return (
        <div className="space-y-6">
            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard
                    title="Seguidores"
                    value={data.facebook.followers.toLocaleString()}
                    icon={Users}
                    color="text-blue-600"
                    bg="bg-blue-100"
                />
                <KPICard
                    title="Alcance"
                    value={data.facebook.reach.toLocaleString()}
                    icon={BarChart2}
                    color="text-green-600"
                    bg="bg-green-100"
                />
                <KPICard
                    title="Interacciones"
                    value={data.facebook.engagement.toLocaleString()}
                    icon={Heart}
                    color="text-pink-600"
                    bg="bg-pink-100"
                />
                <KPICard
                    title="Impresiones"
                    value={data.facebook.impressions.toLocaleString()}
                    icon={Share2}
                    color="text-purple-600"
                    bg="bg-purple-100"
                />
            </div>

            {/* Top Posts */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <ImageIcon className="w-5 h-5 text-gray-500" />
                        Top Publicaciones Recientes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-3 gap-4">
                        {data.facebook.top_posts.map((post) => (
                            <a
                                key={post.id}
                                href={post.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group block bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                            >
                                <div className="aspect-square bg-gray-200 relative">
                                    {post.image ? (
                                        <img src={post.image} alt="Post" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-400">
                                            <ImageIcon className="w-8 h-8" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <ExternalLink className="text-white drop-shadow-md w-6 h-6" />
                                    </div>
                                </div>
                                <div className="p-3">
                                    <p className="text-xs text-gray-500 line-clamp-2 mb-2 h-8">
                                        {post.message || 'Sin descripción'}
                                    </p>
                                    <div className="flex justify-between items-center text-xs font-medium text-gray-700">
                                        <span className="flex items-center gap-1">
                                            <Heart className="w-3 h-3 text-pink-500" /> {post.engagement}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <BarChart2 className="w-3 h-3 text-blue-500" /> {post.reach}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-2 text-right">
                                        {new Date(post.date).toLocaleDateString()}
                                    </p>
                                </div>
                            </a>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <p className="text-xs text-center text-gray-400 mt-4">
                Actualizado: {new Date(data.last_updated).toLocaleString()}
            </p>
        </div>
    )
}

function KPICard({ title, value, icon: Icon, color, bg }: any) {
    return (
        <Card>
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bg} ${color} mb-1`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</span>
                    <p className="text-xl md:text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
                </div>
            </CardContent>
        </Card>
    )
}
