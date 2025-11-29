// import React, { useState } from 'react';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Checkbox } from '@/components/ui/checkbox';
//
// const W9FormDemo = () => {
//   const [formData, setFormData] = useState<any>({});
//
//   const handleChange = (field: string, value: any) => {
//     setFormData((prev: any) => ({ ...prev, [field]: value }));
//   };
//
//   const handlePrint = () => {
//     window.print();
//   };
//
//   return (
//     <div className="min-h-screen bg-gray-200 p-4">
//       <div className="max-w-[8.5in] mx-auto bg-white shadow-2xl p-8" style={{ minHeight: '11in' }}>
//         {/* Header */}
//         <div className="flex justify-between items-start mb-4">
//           <div className="flex-1">
//             <div className="flex items-baseline gap-2">
//               <span className="text-sm">Form</span>
//               <span className="text-5xl font-bold">W-9</span>
//             </div>
//             <div className="text-[9px] mt-1">
//               <div>(Rev. March 2024)</div>
//               <div>Department of the Treasury</div>
//               <div>Internal Revenue Service</div>
//             </div>
//           </div>
//           <div className="flex-1 text-center">
//             <h1 className="text-xl font-bold">Request for Taxpayer</h1>
//             <h2 className="text-xl font-bold">Identification Number and Certification</h2>
//             <p className="text-[9px] mt-2">
//               Go to <span className="underline">www.irs.gov/FormW9</span> for instructions and the latest information.
//             </p>
//           </div>
//           <div className="flex-1 text-right">
//             <div className="border border-black p-2 text-[9px]">
//               <div className="font-bold">Give form to the</div>
//               <div className="font-bold">requester. Do not</div>
//               <div className="font-bold">send to the IRS.</div>
//             </div>
//           </div>
//         </div>
//
//         <div className="text-[9px] mb-3">
//           <span className="font-bold">Before you begin:</span> For guidance related to the purpose of Form W-9, see <span className="italic">Purpose of Form</span>, below.
//         </div>
//
//         {/* Field 1 */}
//         <div className="mb-3">
//           <div className="flex gap-2 text-[9px] mb-1">
//             <span className="font-bold">1</span>
//             <span>Name (as shown on your income tax return). Name is required on this line; do not leave this line blank.</span>
//           </div>
//           <Input
//             className="w-full border-black border h-8 text-sm"
//             onChange={(e) => handleChange('name', e.target.value)}
//           />
//         </div>
//
//         {/* Field 2 */}
//         <div className="mb-3">
//           <div className="flex gap-2 text-[9px] mb-1">
//             <span className="font-bold">2</span>
//             <span>Business name/disregarded entity name, if different from above</span>
//           </div>
//           <Input
//             className="w-full border-black border h-8 text-sm"
//             onChange={(e) => handleChange('businessName', e.target.value)}
//           />
//         </div>
//
//         {/* Field 3 - Tax Classification */}
//         <div className="mb-3 border border-black p-2">
//           <div className="flex gap-2 text-[9px] mb-2">
//             <span className="font-bold">3</span>
//             <span>Check the appropriate box for federal tax classification of the entity/individual whose name is entered on line 1. Check only one of the following seven boxes.</span>
//           </div>
//           <div className="grid grid-cols-3 gap-2 text-[9px]">
//             <label className="flex items-center gap-1">
//               <Checkbox onCheckedChange={(c) => handleChange('taxClass', 'individual')} />
//               <span>Individual/sole proprietor or single-member LLC</span>
//             </label>
//             <label className="flex items-center gap-1">
//               <Checkbox onCheckedChange={(c) => handleChange('taxClass', 'ccorp')} />
//               <span>C Corporation</span>
//             </label>
//             <label className="flex items-center gap-1">
//               <Checkbox onCheckedChange={(c) => handleChange('taxClass', 'scorp')} />
//               <span>S corporation</span>
//             </label>
//             <label className="flex items-center gap-1">
//               <Checkbox onCheckedChange={(c) => handleChange('taxClass', 'partnership')} />
//               <span>Partnership</span>
//             </label>
//             <label className="flex items-center gap-1">
//               <Checkbox onCheckedChange={(c) => handleChange('taxClass', 'trust')} />
//               <span>Trust/estate</span>
//             </label>
//           </div>
//           <div className="mt-2 text-[9px]">
//             <label className="flex items-start gap-1">
//               <Checkbox />
//               <span>LLC. Enter the tax classification (C = C corporation, S = S corporation, P = Partnership)</span>
//             </label>
//             <Input className="w-32 border-black border h-6 ml-4 mt-1" placeholder="Enter code" />
//           </div>
//           <div className="mt-2 text-[9px]">
//             <label className="flex items-start gap-1">
//               <Checkbox />
//               <span>Other (see instructions)</span>
//             </label>
//           </div>
//         </div>
//
//         {/* Exemptions */}
//         <div className="mb-3 border-l-2 border-black pl-2">
//           <div className="text-[9px] font-bold mb-1">4 Exemptions (codes apply only to certain entities, not individuals; see instructions on page 3):</div>
//           <div className="grid grid-cols-2 gap-2">
//             <div>
//               <div className="text-[9px]">Exempt payee code (if any)</div>
//               <Input className="w-full border-black border h-6 text-sm" />
//             </div>
//             <div>
//               <div className="text-[9px]">Exemption from FATCA reporting code (if any)</div>
//               <Input className="w-full border-black border h-6 text-sm" />
//             </div>
//           </div>
//         </div>
//
//         {/* Address Fields */}
//         <div className="grid grid-cols-2 gap-3 mb-3">
//           <div>
//             <div className="flex gap-2 text-[9px] mb-1">
//               <span className="font-bold">5</span>
//               <span>Address (number, street, and apt. or suite no.) See instructions.</span>
//             </div>
//             <Input className="w-full border-black border h-8 text-sm" />
//           </div>
//           <div>
//             <div className="text-[9px] mb-1">Requester's name and address (optional)</div>
//             <Input className="w-full border-black border h-8 text-sm" />
//           </div>
//         </div>
//
//         <div className="grid grid-cols-2 gap-3 mb-3">
//           <div>
//             <div className="flex gap-2 text-[9px] mb-1">
//               <span className="font-bold">6</span>
//               <span>City, state, and ZIP code</span>
//             </div>
//             <Input className="w-full border-black border h-8 text-sm" />
//           </div>
//           <div className="h-8"></div>
//         </div>
//
//         <div className="mb-4">
//           <div className="flex gap-2 text-[9px] mb-1">
//             <span className="font-bold">7</span>
//             <span>List account number(s) here (optional)</span>
//           </div>
//           <Input className="w-full border-black border h-8 text-sm" />
//         </div>
//
//         {/* Part I - TIN */}
//         <div className="border-2 border-black mb-3">
//           <div className="bg-black text-white px-2 py-1 flex items-center gap-2">
//             <span className="font-bold">Part I</span>
//             <span className="text-sm font-bold">Taxpayer Identification Number (TIN)</span>
//           </div>
//           <div className="p-3 text-[9px]">
//             <p className="mb-2">Enter your TIN in the appropriate box. The TIN provided must match the name given on line 1 to avoid backup withholding. For individuals, this is generally your social security number (SSN). However, for a resident alien, sole proprietor, or disregarded entity, see the instructions for Part I, later. For other entities, it is your employer identification number (EIN). If you do not have a number, see How to get a TIN, later.</p>
//
//             <div className="flex gap-4 items-start mt-3">
//               <div>
//                 <div className="font-bold mb-1">Social security number</div>
//                 <div className="flex gap-1">
//                   {[...Array(3)].map((_, i) => <Input key={i} className="w-8 h-8 border-black border text-center" maxLength={1} />)}
//                   <span className="mx-1">-</span>
//                   {[...Array(2)].map((_, i) => <Input key={i} className="w-8 h-8 border-black border text-center" maxLength={1} />)}
//                   <span className="mx-1">-</span>
//                   {[...Array(4)].map((_, i) => <Input key={i} className="w-8 h-8 border-black border text-center" maxLength={1} />)}
//                 </div>
//               </div>
//               <div className="font-bold self-center">or</div>
//               <div>
//                 <div className="font-bold mb-1">Employer identification number</div>
//                 <div className="flex gap-1">
//                   {[...Array(2)].map((_, i) => <Input key={i} className="w-8 h-8 border-black border text-center" maxLength={1} />)}
//                   <span className="mx-1">-</span>
//                   {[...Array(7)].map((_, i) => <Input key={i} className="w-8 h-8 border-black border text-center" maxLength={1} />)}
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//
//         {/* Part II - Certification */}
//         <div className="border-2 border-black mb-4">
//           <div className="bg-black text-white px-2 py-1 flex items-center gap-2">
//             <span className="font-bold">Part II</span>
//             <span className="text-sm font-bold">Certification</span>
//           </div>
//           <div className="p-3 text-[9px]">
//             <p className="mb-2">Under penalties of perjury, I certify that:</p>
//             <ol className="list-decimal ml-4 space-y-1">
//               <li>The number shown on this form is my correct taxpayer identification number (or I am waiting for a number to be issued to me); and</li>
//               <li>I am not subject to backup withholding because: (a) I am exempt from backup withholding, or (b) I have not been notified by the Internal Revenue Service (IRS) that I am subject to backup withholding as a result of a failure to report all interest or dividends, or (c) the IRS has notified me that I am no longer subject to backup withholding; and</li>
//               <li>I am a U.S. citizen or other U.S. person (defined below); and</li>
//               <li>The FATCA code(s) entered on this form (if any) indicating that I am exempt from FATCA reporting is correct.</li>
//             </ol>
//             <p className="mt-2 font-bold">Certification instructions.</p>
//             <p className="text-[8px] mt-1">You must cross out item 2 above if you have been notified by the IRS that you are currently subject to backup withholding because you have failed to report all interest and dividends on your tax return.</p>
//           </div>
//
//           <div className="border-t-2 border-black p-2 flex items-center gap-4">
//             <div className="bg-black text-white px-2 py-1 font-bold text-sm">Sign Here</div>
//             <div className="flex-1">
//               <div className="text-[9px] mb-1">Signature of U.S. person</div>
//               <div className="border-b border-black h-8"></div>
//             </div>
//             <div className="w-32">
//               <div className="text-[9px] mb-1">Date</div>
//               <Input type="date" className="border-black border h-8 text-sm" />
//             </div>
//           </div>
//         </div>
//
//         {/* Print Button */}
//         <div className="flex justify-center gap-4 print:hidden">
//           <Button onClick={handlePrint} className="px-8">Print Form</Button>
//           <Button onClick={() => console.log(formData)} variant="outline">View Data</Button>
//         </div>
//       </div>
//
//       <style>{`
//         @media print {
//           body { margin: 0; }
//           @page { size: letter; margin: 0.5in; }
//         }
//       `}</style>
//     </div>
//   );
// };
//
// export default W9FormDemo;
