import React from 'react';
import { MessageSquare, ChevronDown, ChevronUp, X, Send } from 'lucide-react';
import type { Candidate } from '../../types';

interface CommentSectionProps {
  candidate: Candidate;
  selectedJudge: string;
  commentInput: string;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onInputChange: (id: string, value: string) => void;
  onAddComment: (id: string) => void;
  onDeleteComment: (id: string, comment: any) => void;
}

const CommentSection: React.FC<CommentSectionProps> = ({
  candidate,
  selectedJudge,
  commentInput,
  isExpanded,
  onToggleExpand,
  onInputChange,
  onAddComment,
  onDeleteComment
}) => {
  return (
    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
      <div 
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} 
        onClick={() => onToggleExpand(candidate.id)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={16} color="var(--text-muted)" />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            심사 코멘트 ({candidate.comments?.length || 0})
          </span>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </div>

      {isExpanded && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1rem' }}>
            {candidate.comments && candidate.comments.length > 0 ? (
              candidate.comments.map((comment: any) => (
                <div 
                  key={comment.id} 
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.03)', 
                    padding: '0.8rem 1rem', 
                    borderRadius: '12px', 
                    border: '1px solid rgba(255, 255, 255, 0.05)', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start', 
                    gap: '1rem' 
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 'bold', 
                        color: comment.author === '준모' ? '#6366f1' : (comment.author === '정현' ? '#fbbf24' : '#a855f7'), 
                        background: 'rgba(255, 255, 255, 0.05)', 
                        padding: '2px 6px', 
                        borderRadius: '4px' 
                      }}>
                        {comment.author}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: 'rgba(255, 255, 255, 0.9)' }}>
                      {comment.content}
                    </p>
                  </div>
                  {comment.author === selectedJudge && (
                    <button 
                      onClick={() => onDeleteComment(candidate.id, comment)} 
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p style={{ 
                fontSize: '0.85rem', 
                color: 'var(--text-muted)', 
                textAlign: 'center', 
                padding: '1rem', 
                border: '1px dashed rgba(255, 255, 255, 0.05)', 
                borderRadius: '12px' 
              }}>
                아직 작성된 코멘트가 없습니다.
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <input 
              className="premium-input" 
              style={{ flex: 1, padding: '0.6rem 1rem', fontSize: '0.9rem' }} 
              placeholder="질문이나 피드백을 남겨주세요..." 
              value={commentInput} 
              onChange={(e) => onInputChange(candidate.id, e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && onAddComment(candidate.id)} 
            />
            <button 
              className="premium-button" 
              style={{ padding: '0.6rem', borderRadius: '10px' }} 
              onClick={() => onAddComment(candidate.id)} 
              disabled={!commentInput?.trim()}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentSection;
