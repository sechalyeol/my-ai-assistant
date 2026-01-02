// Last Updated: 2026-01-03 01:49:48
import React, { useState, useEffect } from "react";
import { X, CheckCircle2, AlertCircle } from "lucide-react"; // 아이콘 예쁘게 쓰기 위해 추가
import "./EquipmentDetailModal.css";

const EquipmentDetailModal = ({ isOpen, onClose, equipmentId, initialData, onSave }) => {
  const emptyTemplate = {
    name: "",
    maker: "",
    system: "",
    installDate: "",
    location: "",
    status: "NORMAL"
  };

  const [data, setData] = useState(initialData || emptyTemplate);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      setIsEditing(false);
    } else {
      setData(emptyTemplate);
      setIsEditing(true);
    }
  }, [equipmentId, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    console.log("저장된 데이터:", { id: equipmentId, ...data });
    if (onSave) onSave({ id: equipmentId, ...data });
    setIsEditing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        
        {/* 헤더: 상태 배지와 타이틀 */}
        <div className="modal-header">
          <div className="header-left">
            <div className={`status-badge ${data.status === 'WARNING' ? 'warning' : 'normal'}`}>
              {data.status || 'NORMAL'}
            </div>
            
            {isEditing ? (
              <input 
                name="name" 
                value={data.name} 
                onChange={handleChange} 
                className="input-title-edit"
                placeholder="설비명 입력..."
                autoFocus
              />
            ) : (
              <h2>{data.name || "설비명 없음"}</h2>
            )}
          </div>
          
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* 바디: 2열 그리드 레이아웃 */}
        <div className="modal-body">
          <div className="info-grid">
            
            {/* 제조사 */}
            <div className="info-item">
              <label>Manufacturer</label>
              {isEditing ? (
                <input className="info-input" name="maker" value={data.maker} onChange={handleChange} placeholder="제조사 입력" />
              ) : (
                <div className="info-value">{data.maker || "-"}</div>
              )}
            </div>

            {/* 시스템 */}
            <div className="info-item">
              <label>System</label>
              {isEditing ? (
                <input className="info-input" name="system" value={data.system} onChange={handleChange} placeholder="시스템 명" />
              ) : (
                <div className="info-value">{data.system || "-"}</div>
              )}
            </div>

            {/* 설치일 (꽉 차게 쓰기 or 반반) - 여기선 1열로 둠 */}
            <div className="info-item">
              <label>Install Date</label>
              {isEditing ? (
                <input className="info-input" type="date" name="installDate" value={data.installDate} onChange={handleChange} />
              ) : (
                <div className="info-value">{data.installDate || "-"}</div>
              )}
            </div>

            {/* 상태 (Status) - 편집 시 선택 가능하게 */}
            <div className="info-item">
               <label>Status</label>
               {isEditing ? (
                 <select className="info-input" name="status" value={data.status} onChange={handleChange}>
                   <option value="NORMAL">NORMAL</option>
                   <option value="WARNING">WARNING</option>
                   <option value="ERROR">ERROR</option>
                 </select>
               ) : (
                 <div className="info-value" style={{ color: data.status === 'WARNING' ? '#facc15' : '#4ade80' }}>
                   {data.status}
                 </div>
               )}
            </div>

            {/* 위치 (가로로 길게) */}
            <div className="info-item full-width">
              <label>Location Area</label>
              {isEditing ? (
                <input className="info-input" name="location" value={data.location} onChange={handleChange} placeholder="상세 위치 입력" />
              ) : (
                <div className="info-value">{data.location || "-"}</div>
              )}
            </div>

          </div>
        </div>

        {/* 푸터 */}
        <div className="modal-footer">
          {isEditing ? (
            <button className="btn-save" onClick={handleSave}>업데이트 완료</button>
          ) : (
            <button className="btn-edit" onClick={() => setIsEditing(true)}>속성 편집</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EquipmentDetailModal;