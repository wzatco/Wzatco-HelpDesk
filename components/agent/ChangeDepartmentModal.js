import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
    Building2,
    User,
    Ticket,
    ArrowLeft,
    ArrowRight,
    Search,
} from 'lucide-react';

export default function ChangeDepartmentModal({
    isOpen,
    onClose,
    ticketId,
    currentDepartment,
    onChangeComplete
}) {
    const [currentStep, setCurrentStep] = useState(1);
    const [departments, setDepartments] = useState([]);
    const [filteredDepartments, setFilteredDepartments] = useState([]);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [reason, setReason] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchDepartments();
            // Reset state when modal opens
            setCurrentStep(1);
            setSelectedDepartment(null);
            setReason('');
            setSearchQuery('');
            setError('');
        }
    }, [isOpen]);

    useEffect(() => {
        // Filter departments based on search query
        if (searchQuery.trim()) {
            const filtered = departments.filter(dept =>
                dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                dept.description.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredDepartments(filtered);
        } else {
            setFilteredDepartments(departments);
        }
    }, [searchQuery, departments]);

    const fetchDepartments = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await fetch('/api/agent/available-departments');

            if (!response.ok) {
                throw new Error('Failed to fetch departments');
            }

            const data = await response.json();

            if (data.success) {
                // Filter out current department
                const availableDepts = data.departments.filter(
                    dept => dept.id !== currentDepartment?.id
                );
                setDepartments(availableDepts);
                setFilteredDepartments(availableDepts);
            } else {
                setError(data.message || 'Failed to load departments');
            }
        } catch (error) {
            console.error('Error fetching departments:', error);
            setError('Failed to load departments. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDepartmentSelect = (department) => {
        setSelectedDepartment(department);
        setCurrentStep(2);
    };

    const handleBack = () => {
        if (currentStep === 2) {
            setCurrentStep(1);
            setReason('');
            setError('');
        }
    };

    const handleSubmit = async () => {
        if (!reason.trim()) {
            setError('Please provide a reason for changing department');
            return;
        }

        if (!selectedDepartment) {
            setError('Please select a department');
            return;
        }

        try {
            setSubmitting(true);
            setError('');

            const response = await fetch('/api/agent/tickets/change-department', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ticketId,
                    departmentId: selectedDepartment.id,
                    reason: reason.trim(),
                }),
            });

            const data = await response.json();

            if (data.success) {
                onChangeComplete?.();
                onClose();
            } else {
                setError(data.message || 'Failed to change department');
            }
        } catch (error) {
            console.error('Error changing department:', error);
            setError('Failed to change department. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden dark:bg-slate-800">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Building2 className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                        Change Department
                    </DialogTitle>
                </DialogHeader>

                <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
                    {currentStep === 1 && (
                        <div className="space-y-4">
                            {/* Current Department Display */}
                            {currentDepartment && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded-r-lg">
                                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                                        Current Department: {currentDepartment.name}
                                    </p>
                                </div>
                            )}

                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search departments..."
                                    className="pl-10 dark:bg-slate-900 dark:border-slate-700"
                                />
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-lg">
                                    <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                                </div>
                            )}

                            {/* Departments List */}
                            <div className="space-y-3">
                                {loading ? (
                                    <div className="text-center py-8">
                                        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                        <p className="text-slate-600 dark:text-slate-400 mt-3">Loading departments...</p>
                                    </div>
                                ) : filteredDepartments.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                        <p className="text-slate-600 dark:text-slate-400">
                                            {searchQuery ? 'No departments found' : 'No other departments available'}
                                        </p>
                                    </div>
                                ) : (
                                    filteredDepartments.map((dept) => (
                                        <button
                                            key={dept.id}
                                            onClick={() => handleDepartmentSelect(dept)}
                                            className="w-full p-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-violet-500 dark:hover:border-violet-500 hover:shadow-md transition-all text-left"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                                                    <h3 className="font-semibold text-slate-900 dark:text-white">{dept.name}</h3>
                                                </div>
                                                <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600">
                                                    <Ticket className="w-3 h-3 mr-1" />
                                                    {dept.ticketCount}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{dept.description}</p>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                                                <User className="w-3 h-3" />
                                                <span>Head: {dept.departmentHeadName}</span>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="space-y-4">
                            {/* Selected Department Summary */}
                            <div className="bg-violet-50 dark:bg-violet-900/20 border-2 border-violet-200 dark:border-violet-800 p-4 rounded-xl">
                                <p className="text-sm font-semibold text-violet-900 dark:text-violet-300 mb-2">
                                    Changing to:
                                </p>
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                    <span className="font-bold text-slate-900 dark:text-white">{selectedDepartment?.name}</span>
                                </div>
                            </div>

                            {/* Reason Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Reason for Department Change *
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Please explain why this ticket should be transferred to the selected department..."
                                    rows={6}
                                    className="w-full px-4 py-3 border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none resize-none"
                                />
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Provide a clear reason to help the department head understand the context.
                                </p>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-lg">
                                    <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <Button
                                    onClick={handleBack}
                                    variant="outline"
                                    className="flex-1 py-3 border-2 border-slate-300 dark:border-slate-700"
                                    disabled={submitting}
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={submitting || !reason.trim()}
                                    className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white py-3"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                            Changing...
                                        </>
                                    ) : (
                                        <>
                                            <Building2 className="w-4 h-4 mr-2" />
                                            Change Department
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
