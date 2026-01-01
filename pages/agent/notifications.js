import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AgentLayout from '../../components/agent/universal/AgentLayout';
import PageHead from '../../components/admin/PageHead';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
    Bell,
    BellOff,
    ArrowRight,
    Ticket,
    User,
    Calendar,
    FileText,
    Trash2,
    ExternalLink
} from 'lucide-react';

export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState([]);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/agent/notifications');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setNotifications(data.notifications);
                    const firstUnread = data.notifications.find(n => !n.read);
                    if (firstUnread) {
                        setSelectedNotification(firstUnread);
                    } else if (data.notifications.length > 0) {
                        setSelectedNotification(data.notifications[0]);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            const response = await fetch(`/api/agent/notifications/${notificationId}/mark-read`, {
                method: 'POST',
            });
            if (response.ok) {
                setNotifications(prev =>
                    prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
                );
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const deleteNotification = async (notificationId) => {
        try {
            const response = await fetch(`/api/agent/notifications/${notificationId}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                setNotifications(prev => prev.filter(n => n.id !== notificationId));
                if (selectedNotification?.id === notificationId) {
                    setSelectedNotification(null);
                }
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const handleNotificationClick = (notification) => {
        setSelectedNotification(notification);
        if (!notification.read) {
            markAsRead(notification.id);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <AgentLayout>
            <PageHead title="Notifications" />

            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-violet-700 to-purple-800 p-6 text-white shadow-2xl dark:from-violet-800 dark:via-violet-900 dark:to-purple-950">
                        <div className="absolute inset-0 bg-black/10"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm shadow-xl">
                                    <Bell className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold">Notifications</h1>
                                    <p className="text-violet-100 mt-1">Stay updated with your ticket transfers and important updates</p>
                                </div>
                            </div>
                        </div>
                        <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
                        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl"></div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Content - Notification Details (Larger Left Section) */}
                        <div className="lg:col-span-2 order-1">
                            {selectedNotification ? (
                                <Card className="border-0 shadow-2xl dark:bg-slate-800/80 dark:border-slate-700">
                                    <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-800/30">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                                                    <FileText className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                                                </div>
                                                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                                                    Notification Details
                                                </CardTitle>
                                            </div>
                                            <Button
                                                onClick={() => deleteNotification(selectedNotification.id)}
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-6">
                                        <div>
                                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                                {selectedNotification.title}
                                            </h3>
                                            <p className="text-slate-600 dark:text-slate-400">
                                                {selectedNotification.body}
                                            </p>
                                            <div className="flex items-center gap-2 mt-3">
                                                <Calendar className="w-4 h-4 text-slate-500" />
                                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                                    {new Date(selectedNotification.time).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>

                                        {selectedNotification.type === 'ticket_transfer' && selectedNotification.metadata && (
                                            <>
                                                <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                                                            <Ticket className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                                        </div>
                                                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                                                            Ticket Information
                                                        </h4>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/50 dark:to-violet-900/30 border-2 border-violet-200 dark:border-violet-800/50 p-4 rounded-xl">
                                                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                                                                Ticket ID
                                                            </label>
                                                            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                                                                #{selectedNotification.metadata.ticketId}
                                                            </p>
                                                        </div>
                                                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border-2 border-blue-200 dark:border-blue-800/50 p-4 rounded-xl">
                                                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                                                                Transferred By
                                                            </label>
                                                            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                                                                <User className="w-4 h-4 text-slate-500" />
                                                                {selectedNotification.metadata.transferredBy}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {selectedNotification.metadata.ticketSubject && (
                                                        <div className="mt-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                                                                Subject
                                                            </label>
                                                            <p className="text-sm text-slate-900 dark:text-white mt-1">
                                                                {selectedNotification.metadata.ticketSubject}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                {selectedNotification.metadata.transferReason && (
                                                    <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                                                        <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                                                            Transfer Reason
                                                        </h4>
                                                        <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded-r-lg">
                                                            <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                                                                {selectedNotification.metadata.transferReason}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                                                    <Link href={`/agent/tickets/${selectedNotification.metadata.ticketId}`}>
                                                        <Button className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all">
                                                            <Ticket className="w-5 h-5 mr-2" />
                                                            View Ticket Details
                                                            <ExternalLink className="w-4 h-4 ml-2" />
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            ) : (
                                <Card className="border-0 shadow-2xl dark:bg-slate-800/80 dark:border-slate-700">
                                    <CardContent className="p-12 text-center">
                                        <Bell className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                            Select a Notification
                                        </h3>
                                        <p className="text-slate-600 dark:text-slate-400">
                                            Click on a notification from the list to view its details
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Sidebar - Notifications List */}
                        <div className="lg:col-span-1 order-2">
                            <Card className="border-0 shadow-2xl dark:bg-slate-800/80 dark:border-slate-700">
                                <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-800/30">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                                            <Bell className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                        </div>
                                        <div className="flex-1">
                                            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center justify-between">
                                                <span>All Notifications</span>
                                                <Badge className="bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800">
                                                    {notifications.length}
                                                </Badge>
                                            </CardTitle>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {loading ? (
                                        <div className="p-8 text-center">
                                            <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                            <p className="text-slate-600 dark:text-slate-400 mt-3">Loading...</p>
                                        </div>
                                    ) : notifications.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <BellOff className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                            <p className="text-slate-600 dark:text-slate-400">No notifications yet</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-200 dark:divide-slate-700 max-h-[600px] overflow-y-auto">
                                            {notifications.map((notification) => (
                                                <button
                                                    key={notification.id}
                                                    onClick={() => handleNotificationClick(notification)}
                                                    className={`w-full text-left p-4 transition-all hover:bg-violet-50 dark:hover:bg-slate-700/50 ${selectedNotification?.id === notification.id
                                                        ? 'bg-violet-50 dark:bg-violet-900/20 border-l-4 border-violet-600'
                                                        : !notification.read
                                                            ? 'bg-violet-50/50 dark:bg-violet-900/10'
                                                            : ''
                                                        }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!notification.read ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-600'
                                                            }`}></div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-sm font-semibold truncate ${!notification.read
                                                                ? 'text-slate-900 dark:text-white'
                                                                : 'text-slate-700 dark:text-slate-300'
                                                                }`}>
                                                                {notification.title}
                                                            </p>
                                                            <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-1">
                                                                {notification.body}
                                                            </p>
                                                            <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                                                                {formatDate(notification.time)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </AgentLayout>
    );
}
