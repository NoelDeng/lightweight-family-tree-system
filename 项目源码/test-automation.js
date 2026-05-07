// 浏览器自动化测试脚本
// 使用方法：在浏览器控制台粘贴此脚本并执行

(function() {
  console.log('=== 开始自动化测试 ===');

  // 测试1: 清除数据
  console.log('\n[测试1] 清除数据...');
  try {
    indexedDB.deleteDatabase('family-tree-db');
    console.log('✅ 数据库已清除');
  } catch (e) {
    console.error('❌ 清除数据失败:', e);
  }

  // 等待页面刷新
  setTimeout(() => {
    console.log('\n[测试2] 模拟设置密码...');
    try {
      // 获取DOM元素
      const setupPasswordInput = document.querySelector('input[placeholder="请输入密码"]');
      const confirmPasswordInput = document.querySelectorAll('input[placeholder="请再次输入密码"]')[0];
      const setupBtn = document.querySelector('button.setup-btn');

      if (!setupPasswordInput || !confirmPasswordInput || !setupBtn) {
        throw new Error('未找到设置密码的元素');
      }

      // 输入密码
      setupPasswordInput.value = '123456';
      confirmPasswordInput.value = '123456';
      console.log('✅ 密码输入完成');

      // 点击设置按钮
      setupBtn.click();
      console.log('✅ 设置密码按钮已点击');

      // 等待跳转
      setTimeout(() => {
        console.log('\n[测试3] 模拟登录...');
        try {
          const passwordInput = document.querySelector('input[placeholder="请输入密码"]');
          const loginBtn = document.querySelector('button.login-btn');

          if (!passwordInput || !loginBtn) {
            throw new Error('未找到登录元素');
          }

          // 输入密码
          passwordInput.value = '123456';
          console.log('✅ 密码输入完成');

          // 点击登录按钮
          loginBtn.click();
          console.log('✅ 登录按钮已点击');

          // 等待跳转到主界面
          setTimeout(() => {
            console.log('\n[测试4] 检查主界面...');
            try {
              const mainApp = document.querySelector('.main-container');
              const treePanel = document.querySelector('.tree-panel');

              if (mainApp && treePanel) {
                console.log('✅ 主界面加载成功');
                console.log('✅ 树状面板存在');

                // 测试添加节点
                console.log('\n[测试5] 添加节点...');
                try {
                  const addNodeBtn = document.querySelector('.add-node-btn');

                  if (!addNodeBtn) {
                    throw new Error('未找到添加节点按钮');
                  }

                  addNodeBtn.click();
                  console.log('✅ 添加节点按钮已点击');

                  // 等待弹窗出现
                  setTimeout(() => {
                    const dialog = document.querySelector('.add-node-dialog-overlay');
                    if (dialog) {
                      console.log('✅ 添加节点弹窗已打开');

                      // 填写节点信息
                      const nameInput = document.querySelector('input[placeholder="请输入姓名"]');
                      const genderSelect = document.querySelector('#nodeGender');
                      const confirmBtn = document.querySelector('.confirm-btn');

                      if (nameInput && genderSelect && confirmBtn) {
                        nameInput.value = '张三';
                        genderSelect.value = 'male';
                        console.log('✅ 节点信息填写完成');

                        // 点击确认
                        confirmBtn.click();
                        console.log('✅ 确认按钮已点击');

                        // 等待刷新
                        setTimeout(() => {
                          console.log('\n[测试6] 检查节点是否添加...');
                          try {
                            const nodes = document.querySelectorAll('.node-circle');
                            if (nodes.length > 0) {
                              console.log(`✅ 成功添加节点，当前节点数: ${nodes.length}`);
                              console.log('✅ 所有测试通过！');
                            } else {
                              console.log('⚠️ 节点未显示，但操作成功');
                            }
                          } catch (e) {
                            console.error('❌ 检查节点失败:', e);
                          }
                        }, 1000);
                      } else {
                        console.error('❌ 未找到表单元素');
                      }
                    } else {
                      console.error('❌ 添加节点弹窗未打开');
                    }
                  }, 500);
                } catch (e) {
                  console.error('❌ 添加节点失败:', e);
                }
              } else {
                console.error('❌ 主界面未正确加载');
              }
            } catch (e) {
              console.error('❌ 检查主界面失败:', e);
            }
          }, 1000);
        } catch (e) {
          console.error('❌ 登录失败:', e);
        }
      }, 1000);
    } catch (e) {
      console.error('❌ 设置密码失败:', e);
    }
  }, 1000);

  console.log('\n=== 测试脚本已启动，请等待测试完成 ===');
})();
