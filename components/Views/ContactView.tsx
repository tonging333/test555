import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

const ContactView: React.FC = () => {
    return (
        <div className="max-w-5xl mx-auto px-4 py-12">
            <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-slate-800 dark:text-white mb-4 transition-colors">ติดต่อเรา</h2>
                <p className="text-lg text-slate-500 dark:text-slate-400 transition-colors">ส่วนจัดการงบประมาณ พร้อมให้บริการและให้คำปรึกษา</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 transition-colors">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-8 pb-4 border-b border-slate-100 dark:border-slate-700">ข้อมูลการติดต่อ</h3>
                    <div className="space-y-8">
                        <div className="flex items-start gap-5">
                            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center shrink-0">
                                <Mail className="text-blue-600 dark:text-blue-400" size={24} />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 dark:text-slate-200 text-lg mb-1">อีเมล</p>
                                <p className="text-slate-500 dark:text-slate-400">budgetplan703@gmail.com</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">ส่งเอกสารหรือสอบถามข้อมูลทั่วไป</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-5">
                            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center shrink-0">
                                <Phone className="text-emerald-600 dark:text-emerald-400" size={24} />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 dark:text-slate-200 text-lg mb-1">โทรศัพท์</p>
                                <p className="text-slate-500 dark:text-slate-400">02-940-6490 ต่อ 1244</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">ติดต่อในวันและเวลาราชการ</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-5">
                            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center shrink-0">
                                <MapPin className="text-purple-600 dark:text-purple-400" size={24} />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 dark:text-slate-200 text-lg mb-1">ที่อยู่</p>
                                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                                    อาคารสืบ นาคะเสถียร ชั้น 3<br />
                                    กรมอุทยานแห่งชาติ สัตว์ป่า และพันธุ์พืช<br />
                                    61 ถนนพหลโยธิน แขวงลาดยาว เขตจตุจักร<br />
                                    กรุงเทพมหานคร 10900
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 flex-1 transition-colors">
                        <div className="flex items-center gap-3 mb-6">
                            <Clock className="text-emerald-600 dark:text-emerald-400" size={24} />
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">เวลาทำการ</h3>
                        </div>
                         <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                <span className="font-medium text-slate-700 dark:text-slate-300">จันทร์ - ศุกร์</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-lg text-sm">08:30 - 16:30</span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400">
                                <span>เสาร์ - อาทิตย์</span>
                                <span className="text-sm bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-lg">ปิดทำการ</span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400">
                                <span>วันหยุดนักขัตฤกษ์</span>
                                <span className="text-sm bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-lg">ปิดทำการ</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-blue-600 dark:bg-blue-700 rounded-2xl p-8 text-white shadow-lg shadow-blue-900/20">
                        <h4 className="font-bold text-lg mb-2">ต้องการความช่วยเหลือด่วน?</h4>
                        <p className="text-blue-100 mb-4 text-sm">หากพบปัญหาการใช้งานระบบ หรือต้องการแก้ไขข้อมูลเร่งด่วน</p>
                        <a 
                            href="mailto:budgetplan703@gmail.com?subject=แจ้งปัญหาการใช้งานระบบ DNP Budget Plan"
                            className="block w-full py-3 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-colors text-center shadow-sm"
                        >
                            แจ้งปัญหาการใช้งาน
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactView;