package io.github.tknknk.yucale.repository;

import io.github.tknknk.yucale.entity.Notice;
import io.github.tknknk.yucale.entity.User;
import io.github.tknknk.yucale.enums.Role;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * ユーザー削除時に、作成したお知らせの作成者を付け替えるクエリのテスト。
 *
 * SurveyRepository#reassignCreatedBy も同じ形のクエリだが、
 * surveys.response_options が JSONB のためH2ではテーブルを作成できず、
 * ここではテストできない（PostgreSQL互換モードでもJSONBは未対応）。
 */
@DataJpaTest
class ContentOwnershipTransferTest {

    @Autowired
    private NoticeRepository noticeRepository;

    @Autowired
    private EntityManager entityManager;

    private User editor;
    private User admin;
    private User otherEditor;

    @BeforeEach
    void setUp() {
        editor = persistUser("editoruser", "editor@example.com", Role.EDITOR);
        admin = persistUser("adminuser", "admin@example.com", Role.ADMIN);
        otherEditor = persistUser("othereditor", "other@example.com", Role.EDITOR);
    }

    private User persistUser(String username, String email, Role role) {
        User user = User.builder()
                .username(username)
                .email(email)
                .passwordHash("hashedPassword")
                .role(role)
                .build();
        entityManager.persist(user);
        return user;
    }

    private Notice persistNotice(String title, User createdBy) {
        Notice notice = Notice.builder()
                .title(title)
                .content("本文")
                .createdBy(createdBy)
                .build();
        entityManager.persist(notice);
        return notice;
    }

    @Test
    @DisplayName("対象ユーザーのお知らせだけが引き継ぎ先に付け替わる")
    void reassignNotices_onlyAffectsTargetUser() {
        Notice ownNotice = persistNotice("editorのお知らせ", editor);
        Notice otherNotice = persistNotice("他人のお知らせ", otherEditor);
        entityManager.flush();

        int updated = noticeRepository.reassignCreatedBy(editor.getId(), admin);
        entityManager.flush();
        entityManager.clear();

        assertThat(updated).isEqualTo(1);
        assertThat(noticeRepository.findById(ownNotice.getId()).orElseThrow().getCreatedBy().getId())
                .isEqualTo(admin.getId());
        assertThat(noticeRepository.findById(otherNotice.getId()).orElseThrow().getCreatedBy().getId())
                .isEqualTo(otherEditor.getId());
    }

    @Test
    @DisplayName("引き継ぐお知らせがない場合は0件を返す")
    void reassign_noContent_returnsZero() {
        assertThat(noticeRepository.reassignCreatedBy(editor.getId(), admin)).isZero();
    }
}
